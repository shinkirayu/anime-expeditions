--// ---------------------------------------------------------------------------
--// Services
--// ---------------------------------------------------------------------------
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")

local LocalPlayer = Players.LocalPlayer

--// ---------------------------------------------------------------------------
--// Configuration
--// ---------------------------------------------------------------------------
local CONFIG = {
	-- Where to send updates. This is shinkirayu@gmail.com's personal tracker
	-- endpoint — do not share it, anyone with it can post data attributed to you.
	Endpoint = "https://odohvvxgyqjibkxxsnty.supabase.co/functions/v1/ingest?key=47fec71393db41f6b93b25d706d415ce44d0b0e549db42ff8d806a917fe05112",

	-- Minimum seconds between checking for changes.
	FlushInterval = 20.0,

	-- Even with nothing changed, send a heartbeat this often so the dashboard
	-- doesn't show you as offline while you're actually still in-game.
	HeartbeatInterval = 60.0,

	-- Verbose discovery / diff logging.
	Debug = true,

	-- Replica token (Madwork ReplicaService class token) that holds live
	-- "currently in a stage/expedition" state. Only present while a match
	-- is actually running; absent while in the lobby. (MapData also exists
	-- but only holds waypoint/path geometry — huge and useless for tracking.)
	LiveStageTokens = { "GameState" },

	-- How long to wait at startup for the PlayerData replica to arrive.
	InitialDataTimeout = 15,

	-- Item asset names (ItemData keys) always reported as currencies even
	-- though the game's own Items sheet classifies them as SubType "Material"
	-- (e.g. Trait Crystal / "TraitReroll") — things worth tracking prominently
	-- alongside real currencies like Gems.
	PinnedCurrencyItems = { "TraitReroll" },
}

--// ---------------------------------------------------------------------------
--// Logger
--// ---------------------------------------------------------------------------
local Log = {}
do
	local PREFIX = "[AE-Tracker]"
	function Log.info(...)
		if CONFIG.Debug then
			print(PREFIX, ...)
		end
	end
	function Log.found(what, where)
		if CONFIG.Debug then
			print(PREFIX, "FOUND", what, "->", where)
		end
	end
	function Log.missing(what)
		if CONFIG.Debug then
			warn(PREFIX, "MISSING", what)
		end
	end
	function Log.warn(...)
		warn(PREFIX, ...)
	end
end

--// ---------------------------------------------------------------------------
--// Utility helpers (all fail-safe)
--// ---------------------------------------------------------------------------
local Util = {}

function Util.safe(fn, fallback)
	local ok, result = pcall(fn)
	if ok then
		return result
	end
	return fallback
end

-- Coerce arbitrary Roblox values into JSON-friendly primitives.
function Util.jsonSafe(v)
	local t = typeof(v)
	if t == "number" or t == "string" or t == "boolean" or t == "nil" then
		return v
	elseif t == "EnumItem" then
		return tostring(v)
	elseif t == "Vector3" then
		return { x = v.X, y = v.Y, z = v.Z }
	elseif t == "Vector2" then
		return { x = v.X, y = v.Y }
	elseif t == "Color3" then
		return { r = v.R, g = v.G, b = v.B }
	elseif t == "Instance" then
		return v.Name
	elseif t == "table" then
		return v -- handled by deepJsonSafe
	end
	return tostring(v)
end

-- Recursively copy a replica sub-table into a plain, JSON-safe table.
function Util.deepJsonSafe(v)
	if typeof(v) ~= "table" then
		return Util.jsonSafe(v)
	end
	local out = {}
	for k, val in pairs(v) do
		out[k] = Util.deepJsonSafe(val)
	end
	return out
end

-- Deep, order-independent equality for the plain tables we build.
function Util.deepEqual(a, b)
	if a == b then
		return true
	end
	if typeof(a) ~= "table" or typeof(b) ~= "table" then
		return false
	end
	for k, v in pairs(a) do
		if not Util.deepEqual(v, b[k]) then
			return false
		end
	end
	for k in pairs(b) do
		if a[k] == nil then
			return false
		end
	end
	return true
end

function Util.deepCopy(v)
	if typeof(v) ~= "table" then
		return v
	end
	local out = {}
	for k, val in pairs(v) do
		out[k] = Util.deepCopy(val)
	end
	return out
end

--// ---------------------------------------------------------------------------
--// ReplicaSource
--// This game replicates player state via Madwork's ReplicaService. The client
--// counterpart lives at ReplicatedStorage.Shared.ReplicaClient and exposes
--// OnNew(token, callback) which fires immediately for already-created
--// replicas of that class token (and again for future ones).
--// ---------------------------------------------------------------------------
local ReplicaSource = {}
ReplicaSource.RC = nil
ReplicaSource.PlayerReplica = nil
ReplicaSource.LiveTokenReplicas = {}

function ReplicaSource.init()
	local ok, RC = pcall(function()
		return require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("ReplicaClient"))
	end)
	if not ok then
		Log.warn("ReplicaClient not found:", RC)
		return nil
	end
	ReplicaSource.RC = RC

	Util.safe(function()
		RC.RequestData()
	end)

	RC.OnNew("PlayerData", function(replica)
		ReplicaSource.PlayerReplica = replica
		Log.found("PlayerData replica", tostring(replica.Id or replica))
	end)

	for _, token in ipairs(CONFIG.LiveStageTokens) do
		RC.OnNew(token, function(replica)
			ReplicaSource.LiveTokenReplicas[token] = replica
			Log.found("live stage replica", token)
		end)
	end

	return RC
end

function ReplicaSource.waitForPlayerData(timeoutSeconds)
	local start = os.clock()
	while ReplicaSource.PlayerReplica == nil and (os.clock() - start) < timeoutSeconds do
		task.wait(0.25)
	end
	if not ReplicaSource.PlayerReplica then
		Log.missing("PlayerData replica (timed out after " .. timeoutSeconds .. "s)")
	end
end

--// ---------------------------------------------------------------------------
--// Static game data (SheetSyncedModules) — used to enrich raw ids with
--// display names / rarity / currency classification. All optional: if the
--// game restructures these, trackers below fall back to raw values.
--// ---------------------------------------------------------------------------
-- Loaded via StaticInfo.load(), called from main() AFTER the game finishes
-- loading — NOT at file-load time. These modules can take a while to
-- replicate; requiring them too early silently leaves StaticInfo empty for
-- the rest of the session (nothing gets classified as a currency, no rarity
-- enrichment) with no retry, since it only ever runs once.
local StaticInfo = {}

local function tryRequire(...)
	local parts = { ... }
	local ok, mod = pcall(function()
		local cur = ReplicatedStorage
		for _, part in ipairs(parts) do
			cur = cur:WaitForChild(part, 15)
		end
		return require(cur)
	end)
	if ok then
		return mod
	end
	Log.missing("static info: " .. table.concat(parts, "/"))
	return nil
end

function StaticInfo.load()
	StaticInfo.Items = tryRequire("Shared", "Information", "Items")
	StaticInfo.Units = tryRequire("Shared", "Information", "Units")
	local levelMod = tryRequire("Shared", "Information", "PlayerLevelInfo")
	StaticInfo.LevelInfo = levelMod and levelMod.LevelInfo or nil
end

-- Convert cumulative Exp into an account Level using the game's own
-- level-threshold table (LevelInfo[n].TotalEXP = cumulative EXP required for level n).
local function levelFromExp(exp)
	local li = StaticInfo.LevelInfo
	if not li or typeof(exp) ~= "number" then
		return nil, nil
	end
	local level = 1
	local i = 1
	while li[i] and li[i].TotalEXP ~= nil and li[i].TotalEXP <= exp do
		level = i
		i += 1
	end
	local nextEntry = li[level + 1]
	return level, nextEntry and nextEntry.TotalEXP or nil
end

--// ---------------------------------------------------------------------------
--// Trackers
--// Each reads the flat PlayerData.Data table (already the live replica data,
--// mutated in place by ReplicaService as the server pushes updates).
--// ---------------------------------------------------------------------------
local Trackers = {}

function Trackers.account(data)
	local exp = data.Exp
	local level, nextLevelExp = levelFromExp(exp)
	return {
		Username = Util.safe(function() return LocalPlayer.Name end),
		DisplayName = Util.safe(function() return LocalPlayer.DisplayName end),
		UserId = Util.safe(function() return LocalPlayer.UserId end),
		Level = level,
		Exp = exp,
		NextLevelExp = nextLevelExp,
	}
end

-- ItemData holds both currencies and regular items; the static Items sheet
-- tags each Asset with SubType == "Currency" for the ones that are currencies.
local function isPinnedCurrency(name, def)
	if def and def.SubType == "Currency" then
		return true
	end
	for _, pinned in ipairs(CONFIG.PinnedCurrencyItems) do
		if name == pinned then
			return true
		end
	end
	return false
end

function Trackers.currencies(itemData)
	local out = {}
	if typeof(itemData) ~= "table" then
		return out
	end
	for name, entry in pairs(itemData) do
		local def = StaticInfo.Items and StaticInfo.Items[name]
		if isPinnedCurrency(name, def) then
			out[name] = {
				Amount = typeof(entry) == "table" and entry.Amount or entry,
				DisplayName = def and def.DisplayName or name,
				Rarity = def and def.Rarity,
				Icon = def and def.Icon,
			}
		end
	end
	return out
end

function Trackers.inventory(itemData)
	local out = {}
	if typeof(itemData) ~= "table" then
		return out
	end
	for name, entry in pairs(itemData) do
		local def = StaticInfo.Items and StaticInfo.Items[name]
		if not isPinnedCurrency(name, def) then
			out[name] = {
				Amount = typeof(entry) == "table" and entry.Amount or entry,
				DisplayName = def and def.DisplayName or name,
				SubType = def and def.SubType,
				Rarity = def and def.Rarity,
				Icon = def and def.Icon,
			}
		end
	end
	return out
end

function Trackers.units(unitData)
	local out = {}
	if typeof(unitData) ~= "table" then
		return out
	end
	for uniqueId, u in pairs(unitData) do
		local def = StaticInfo.Units and StaticInfo.Units[u.Asset]
		table.insert(out, {
			UniqueId = uniqueId,
			Asset = u.Asset,
			DisplayName = def and def.DisplayName or u.Asset,
			Rarity = def and def.Rarity,
			Element = def and def.Element,
			Archetype = def and def.Archetype,
			Level = u.Level,
			EXP = u.EXP,
			Equipped = u.Equipped,
			Worthiness = u.Worthiness,
			TotalTakedowns = u.TotalTakedowns,
			ObtainedAt = u.ObtainedAt,
			StatPotential = Util.deepJsonSafe(u.StatPotential),
		})
	end
	return out
end

-- "Stage" progress: historical completed maps plus, when a match is actually
-- running, whatever live zone/state replica the server created for it.
-- Pull just the compact, useful fields out of the GameState replica (its
-- Parameters table has the map/act/difficulty; the sibling MapData replica
-- holds full waypoint path geometry and is deliberately never read here).
local function extractMatch(gameStateData)
	if typeof(gameStateData) ~= "table" then
		return nil
	end
	local params = gameStateData.Parameters
	if typeof(params) ~= "table" or not params.MapName then
		-- Parameters can be transiently empty between wave/session resets.
		-- Report "not in a match" rather than a half-empty placeholder that
		-- would otherwise flicker on and off the real map/stage value.
		return nil
	end
	return {
		MapName = params.MapName,
		ActName = params.ActName,
		Difficulty = params.Difficulty,
		Gamemode = params.Gamemode,
		CurrentGameState = gameStateData.CurrentGameState,
		Wave = gameStateData.Wave,
		MaxWave = gameStateData.MaxWave,
		SessionTime = gameStateData.SessionTime,
	}
end

function Trackers.progress(data)
	local completed = {}
	if typeof(data.CompletedMaps) == "table" then
		for mapId in pairs(data.CompletedMaps) do
			table.insert(completed, tostring(mapId))
		end
	end

	local gameStateReplica = ReplicaSource.LiveTokenReplicas["GameState"]
	local match = gameStateReplica and extractMatch(gameStateReplica.Data)

	return {
		InMatch = match ~= nil,
		Match = match,
		CompletedMapsCount = #completed,
		CompletedMaps = completed,
	}
end

function Trackers.stats(data)
	return Util.deepJsonSafe(data.Stats)
end

--// ---------------------------------------------------------------------------
--// Snapshot assembly
--// ---------------------------------------------------------------------------
local Tracker = {}
Tracker.Snapshot = {}

function Tracker.build()
	local replica = ReplicaSource.PlayerReplica
	if not replica or typeof(replica.Data) ~= "table" then
		return { SchemaVersion = 2, CapturedAt = Util.safe(function() return os.time() end), Ready = false }
	end

	local data = replica.Data
	return {
		SchemaVersion = 2,
		CapturedAt = Util.safe(function() return os.time() end),
		Ready = true,
		Account = Trackers.account(data),
		Currencies = Trackers.currencies(data.ItemData),
		Inventory = Trackers.inventory(data.ItemData),
		Units = Trackers.units(data.UnitData),
		Progress = Trackers.progress(data),
		Stats = Trackers.stats(data),
	}
end

--// ---------------------------------------------------------------------------
--// Transport
--// ---------------------------------------------------------------------------
local Transport = {}

-- Return every executor HTTP function that actually exists, in preference
-- order. We used to stop at the first non-nil candidate and give up if that
-- one threw; some executors expose more than one of these and only some
-- actually work, so now every candidate gets tried before falling through.
local function resolveHttpRequestCandidates()
	local list = {}
	local function add(name, fn)
		if typeof(fn) == "function" then
			table.insert(list, { name = name, fn = fn })
		end
	end
	add("http_request", rawget(getfenv and getfenv() or _G, "http_request"))
	add("syn.request", syn and syn.request)
	add("http.request", http and http.request)
	add("request", rawget(_G, "request"))
	return list
end

function Transport.send(payload)
	local body = Util.safe(function()
		return HttpService:JSONEncode(payload)
	end)
	if not body then
		Log.warn("failed to JSON-encode payload")
		return false
	end

	if CONFIG.Endpoint == "" then
		Log.info("Endpoint not set; would send", #body, "bytes")
		return true
	end

	for _, candidate in ipairs(resolveHttpRequestCandidates()) do
		local ok, err = pcall(function()
			candidate.fn({
				Url = CONFIG.Endpoint,
				Method = "POST",
				Headers = { ["Content-Type"] = "application/json" },
				Body = body,
			})
		end)
		if ok then
			Log.info("sent", #body, "bytes via", candidate.name)
			return true
		end
		Log.warn(candidate.name .. " failed:", tostring(err))
	end

	local ok, err = pcall(function()
		HttpService:PostAsync(CONFIG.Endpoint, body, Enum.HttpContentType.ApplicationJson)
	end)
	if ok then
		Log.info("sent", #body, "bytes via HttpService")
		return true
	end
	Log.warn("HttpService:PostAsync failed:", tostring(err))

	Log.warn("all transport methods failed")
	return false
end

--// ---------------------------------------------------------------------------
--// Change engine: diff, debounce, flush
--// ---------------------------------------------------------------------------
local Engine = {}
Engine._lastCheck = 0
Engine._lastSend = 0

-- `force` sends even when nothing changed — used for the periodic heartbeat
-- so last_seen keeps getting touched while you're online but idle.
function Engine.evaluate(force)
	local fresh = Tracker.build()
	if not force and Util.deepEqual(fresh, Tracker.Snapshot) then
		return
	end
	Tracker.Snapshot = Util.deepCopy(fresh)
	if Transport.send(fresh) then
		Engine._lastSend = os.clock()
	end
end

--// ---------------------------------------------------------------------------
--// Main loop
--// PlayerData is a live replica: reading replica.Data on each tick already
--// reflects the latest server-pushed state, so a simple debounced poll loop
--// (rather than granular per-field signal wiring) is enough to catch changes.
--// ---------------------------------------------------------------------------
local function main()
	if not game:IsLoaded() then
		Log.info("waiting for the game to finish loading...")
		game.Loaded:Wait()
	end

	while not LocalPlayer do
		LocalPlayer = Players.LocalPlayer
		if not LocalPlayer then
			Log.info("waiting for LocalPlayer...")
			Players.PlayerAdded:Wait()
		end
	end

	Log.info("starting for", LocalPlayer.Name, "(" .. tostring(LocalPlayer.UserId) .. ")")

	StaticInfo.load()

	local RC = ReplicaSource.init()
	if not RC then
		Log.warn("could not initialize ReplicaClient; aborting")
		return
	end

	ReplicaSource.waitForPlayerData(CONFIG.InitialDataTimeout)

	-- Prime the first snapshot immediately.
	Engine.evaluate()

	RunService.Heartbeat:Connect(function()
		local now = os.clock()
		if (now - Engine._lastCheck) >= CONFIG.FlushInterval then
			Engine._lastCheck = now
			local heartbeatDue = (now - Engine._lastSend) >= CONFIG.HeartbeatInterval
			Engine.evaluate(heartbeatDue)
		end
	end)

	Log.info("running (polling every " .. CONFIG.FlushInterval .. "s)")
end

task.spawn(main)

--// Expose the module surface for external drivers / debugging consoles.
return {
	CONFIG = CONFIG,
	Tracker = Tracker,
	Trackers = Trackers,
	ReplicaSource = ReplicaSource,
	StaticInfo = StaticInfo,
	Transport = Transport,
	Engine = Engine,
}
