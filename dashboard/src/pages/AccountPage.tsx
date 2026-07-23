import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount, useAccountDetails } from "../hooks/useAccountDetail";
import { useAccountRealtime } from "../hooks/useAccountsRealtime";
import { isOnline, type UnitEntry } from "../lib/types";
import { fmtFullNum, fmtNum, fmtPlaytime, getCurrencyEntry, rarityBoxStyle, rarityClass, timeAgo } from "../lib/format";
import { downloadDataUrl, renderShowcasePng, showcaseFilename } from "../lib/exportShowcase";
import { BarChart } from "../components/BarChart";
import { AssetImage } from "../components/AssetImage";
import {
  AccountShowcaseCard,
  DEFAULT_POSE_TRANSFORM,
  DEFAULT_VISIBLE_STATS,
  type PoseTransform,
  type VisibleStats,
} from "../components/AccountShowcaseCard";
import { CloseButton } from "../components/CloseButton";
import { InventoryShowcaseCard } from "../components/InventoryShowcaseCard";
import { ItemCard } from "../components/ItemCard";
import { StatsShowcaseCard } from "../components/StatsShowcaseCard";
import { StoryProgressBar } from "../components/StoryProgressBar";
import { UnitIconImage } from "../components/UnitIconImage";
import { UnitsShowcaseCard } from "../components/UnitsShowcaseCard";

const UNIT_PAGE = 60;

const SHOWCASE_TYPES = ["hero", "units", "inventory", "stats"] as const;
type ShowcaseType = (typeof SHOWCASE_TYPES)[number];
const SHOWCASE_LABELS: Record<ShowcaseType, string> = {
  hero: "Hero",
  units: "Units",
  inventory: "Inventory",
  stats: "Stats",
};

export default function AccountPage() {
  const params = useParams();
  const userId = params.userId ? Number(params.userId) : null;
  const { data: account, isLoading, isError } = useAccount(userId);
  const details = useAccountDetails(userId);
  useAccountRealtime(userId);

  const [unitLimit, setUnitLimit] = useState(UNIT_PAGE);
  const [unitFilter, setUnitFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcaseType, setShowcaseType] = useState<ShowcaseType>("hero");
  const [showcasePng, setShowcasePng] = useState<string | null>(null);
  const [pose, setPose] = useState<PoseTransform>(DEFAULT_POSE_TRANSFORM);
  const [visibleStats, setVisibleStats] = useState<VisibleStats>(DEFAULT_VISIBLE_STATS);
  const [featuredUnitId, setFeaturedUnitId] = useState<string | null>(null);
  const poseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const showcaseRefs: Record<ShowcaseType, React.RefObject<HTMLDivElement | null>> = {
    hero: heroRef,
    units: unitsRef,
    inventory: inventoryRef,
    stats: statsRef,
  };

  async function renderType(type: ShowcaseType) {
    const node = showcaseRefs[type].current;
    if (!node) return;
    setExporting(true);
    try {
      setShowcasePng(await renderShowcasePng(node));
    } catch (err) {
      console.error("Showcase render failed", err);
    } finally {
      setExporting(false);
    }
  }

  async function handleOpenShowcase() {
    setShowcaseOpen(true);
    await renderType(showcaseType);
  }

  async function handleSwitchShowcase(type: ShowcaseType) {
    setShowcaseType(type);
    setShowcasePng(null);
    await renderType(type);
  }

  function adjustPose(patch: Partial<PoseTransform>) {
    setPose((prev) => ({ ...prev, ...patch }));
    if (poseDebounceRef.current) clearTimeout(poseDebounceRef.current);
    poseDebounceRef.current = setTimeout(() => {
      renderType("hero");
    }, 250);
  }

  function toggleStat(key: keyof VisibleStats) {
    setVisibleStats((prev) => ({ ...prev, [key]: !prev[key] }));
    setTimeout(() => renderType("hero"), 50);
  }

  function selectFeaturedUnit(unitId: string) {
    setFeaturedUnitId(unitId || null);
    setPose(DEFAULT_POSE_TRANSFORM);
    setTimeout(() => renderType("hero"), 50);
  }

  const units = useMemo(() => {
    const all = (details.data?.units ?? []) as UnitEntry[];
    const term = unitFilter.trim().toLowerCase();
    const filtered = term
      ? all.filter((u) =>
          `${u.DisplayName ?? ""} ${u.Asset ?? ""} ${u.Rarity ?? ""} ${u.Trait?.DisplayName ?? ""}`
            .toLowerCase()
            .includes(term),
        )
      : all;
    return filtered
      .slice()
      .sort((a, b) => (b.Level ?? 0) - (a.Level ?? 0) || Number(!!b.Equipped) - Number(!!a.Equipped));
  }, [details.data, unitFilter]);

  const rarityDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of (details.data?.units ?? []) as UnitEntry[]) {
      const r = u.Rarity ?? "Unknown";
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [details.data]);

  const gems = useMemo(() => getCurrencyEntry(account?.currencies, "gem"), [account]);
  const traitCrystal = useMemo(() => getCurrencyEntry(account?.currencies, "trait crystal"), [account]);

  // Currencies (Gems, Trait Crystal, ...) shown pinned at the top of the
  // inventory list instead of a separate currency section. Pinned currencies
  // are also reported as regular inventory server-side now, so skip any
  // inventory entry whose key is already shown as a currency.
  const inventory = useMemo(() => {
    const currencyNames = new Set(Object.keys(account?.currencies ?? {}));
    const currencies = Object.entries(account?.currencies ?? {}).map(
      ([name, c]) => [`currency:${name}`, { ...c, SubType: "Currency" }] as const,
    );
    const items = Object.entries(details.data?.inventory ?? {})
      .filter(([name]) => !currencyNames.has(name))
      .sort(([, a], [, b]) => (b.Amount ?? 0) - (a.Amount ?? 0));
    return [...currencies, ...items] as [
      string,
      { DisplayName?: string; Amount: number; SubType?: string; Rarity?: string; Icon?: string },
    ][];
  }, [account, details.data]);

  if (isLoading) {
    return <div className="animate-pulse rounded-xl bg-zinc-100 p-16 dark:bg-zinc-900" />;
  }
  if (isError || !account) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        Account not found.{" "}
        <Link to="/" className="underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const online = isOnline(account.last_seen);
  const stats = account.stats ?? {};
  const playtime = Number(stats["Playtime"] ?? stats["PlayTime"] ?? stats["TimePlayed"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
          ← All accounts
        </Link>
        <button
          onClick={handleOpenShowcase}
          disabled={exporting || details.isLoading}
          className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.35)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export showcase"}
        </button>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="gradient-purple flex size-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-[0_0_14px_rgba(129,19,255,0.4)]">
            {account.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold">{account.display_name || account.username}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  online
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {online ? (account.in_match ? "IN MATCH" : "ONLINE") : "OFFLINE"}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @{account.username} · ID {account.user_id} · updated {timeAgo(account.updated_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-semibold tabular-nums">Lv {account.level ?? "?"}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {fmtFullNum(account.exp)} EXP
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <Tile
            label="Gems"
            value={fmtFullNum(gems?.Amount ?? 0)}
            icon={<AssetImage rbxAssetId={gems?.Icon} alt="Gems" className="size-5" fallback="💎" />}
          />
          <Tile
            label="Trait Crystal"
            value={fmtFullNum(traitCrystal?.Amount ?? 0)}
            icon={
              <AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" className="size-5" fallback="🔮" />
            }
          />
          <Tile label="Units" value={fmtFullNum(account.unit_count)} />
          <Tile label="Items" value={fmtFullNum(account.item_count)} />
          <Tile
            label="Maps cleared"
            value={fmtFullNum(account.progress?.CompletedMapsCount ?? 0)}
          />
          <Tile label="Playtime" value={fmtPlaytime(Number.isFinite(playtime) ? playtime : null)} />
        </div>
      </div>

      {/* Story + Raid progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Story progress">
          <StoryProgressBar story={account.progress?.Story} label="Story" />
        </Section>
        <Section title="Raid progress">
          <StoryProgressBar story={account.progress?.Raid} label="Raid" />
        </Section>
      </div>

      {/* Live match state */}
      {account.in_match && account.progress?.Match && (
        <Section title="Live match state">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Map" value={account.progress.Match.MapName ?? "—"} />
            <Tile label="Act" value={account.progress.Match.ActName ?? "—"} />
            <Tile label="Difficulty" value={account.progress.Match.Difficulty ?? "—"} />
            <Tile
              label="Wave"
              value={
                account.progress.Match.Wave != null && account.progress.Match.MaxWave != null
                  ? `${account.progress.Match.Wave}/${account.progress.Match.MaxWave}`
                  : "—"
              }
            />
          </div>
        </Section>
      )}

      {/* Units */}
      <Section
        title={`Units (${details.data?.units?.length ?? 0})`}
        right={
          <input
            type="search"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            placeholder="Filter units…"
            className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-fuchsia-400 dark:border-zinc-700"
          />
        }
      >
        {details.isLoading ? (
          <Empty>Loading units…</Empty>
        ) : units.length === 0 ? (
          <Empty>No units.</Empty>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-2 py-2 font-medium">Unit</th>
                    <th className="px-2 py-2 text-center font-medium">Rarity</th>
                    <th className="px-2 py-2 text-center font-medium">Trait</th>
                    <th className="px-2 py-2 text-center font-medium">Level</th>
                    <th className="px-2 py-2 text-center font-medium">Takedowns</th>
                    <th className="px-2 py-2 text-center font-medium">Equipped</th>
                  </tr>
                </thead>
                <tbody>
                  {units.slice(0, unitLimit).map((u) => (
                    <tr
                      key={u.UniqueId}
                      className="cv-auto border-b border-zinc-100 last:border-0 dark:border-white/[0.04]"
                    >
                      <td className="truncate px-2 py-2 font-medium">
                        <span className="flex items-center gap-1.5">
                          <span
                            style={rarityBoxStyle(u.Rarity)}
                            className="size-6 shrink-0 overflow-hidden rounded-[7px] p-0.5"
                          >
                            <UnitIconImage displayName={u.DisplayName} />
                          </span>
                          <span className="truncate">{u.DisplayName || u.Asset}</span>
                        </span>
                      </td>
                      <td className={`px-2 py-2 text-center ${rarityClass(u.Rarity)}`}>{u.Rarity ?? "—"}</td>
                      <td className={`truncate px-2 py-2 text-center ${rarityClass(u.Trait?.Rarity)}`}>
                        {u.Trait?.DisplayName ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{u.Level ?? "—"}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{fmtNum(u.TotalTakedowns)}</td>
                      <td className="px-2 py-2 text-center">{u.Equipped ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {units.length > unitLimit && (
              <button
                onClick={() => setUnitLimit((n) => n + UNIT_PAGE)}
                className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:border-zinc-700 dark:hover:border-fuchsia-500/30 dark:hover:bg-fuchsia-500/10"
              >
                Show more ({units.length - unitLimit} remaining)
              </button>
            )}
          </>
        )}
      </Section>

      {/* Inventory */}
      <Section title={`Inventory (${inventory.length})`}>
        {details.isLoading ? (
          <Empty>Loading…</Empty>
        ) : inventory.length === 0 ? (
          <Empty>No items.</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {inventory.map(([name, item]) => (
              <ItemCard
                key={name}
                name={item.DisplayName || name}
                amount={item.Amount}
                rarity={item.Rarity}
                icon={item.Icon}
                fallback="📦"
              />
            ))}
          </div>
        )}
      </Section>

      <BarChart title="Units by rarity" data={rarityDist} />

      {/* Raw stats */}
      {Object.keys(stats).length > 0 && (
        <Section title="Stats">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/[0.04]">
                <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{k}</div>
                <div className="truncate text-sm font-semibold tabular-nums">
                  {typeof v === "number" ? fmtFullNum(v) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="pointer-events-none fixed top-0 -left-[9999px] opacity-0" aria-hidden="true">
        <AccountShowcaseCard
          ref={heroRef}
          account={account}
          details={details.data}
          pose={pose}
          visibleStats={visibleStats}
          unitId={featuredUnitId}
        />
        <UnitsShowcaseCard ref={unitsRef} account={account} details={details.data} />
        <InventoryShowcaseCard ref={inventoryRef} account={account} details={details.data} />
        <StatsShowcaseCard ref={statsRef} account={account} details={details.data} />
      </div>

      {showcaseOpen && (
        <ShowcasePreviewModal
          src={showcasePng}
          loading={exporting}
          type={showcaseType}
          filename={showcaseFilename(account.username, showcaseType)}
          onSwitch={handleSwitchShowcase}
          pose={pose}
          onAdjustPose={adjustPose}
          visibleStats={visibleStats}
          onToggleStat={toggleStat}
          units={(details.data?.units ?? []) as UnitEntry[]}
          featuredUnitId={featuredUnitId}
          onSelectUnit={selectFeaturedUnit}
          onClose={() => {
            setShowcaseOpen(false);
            setShowcasePng(null);
          }}
        />
      )}
    </div>
  );
}

function ShowcasePreviewModal({
  src,
  loading,
  type,
  filename,
  onSwitch,
  pose,
  onAdjustPose,
  visibleStats,
  onToggleStat,
  units,
  featuredUnitId,
  onSelectUnit,
  onClose,
}: {
  src: string | null;
  loading: boolean;
  type: ShowcaseType;
  filename: string;
  onSwitch: (type: ShowcaseType) => void;
  pose: PoseTransform;
  onAdjustPose: (patch: Partial<PoseTransform>) => void;
  visibleStats: VisibleStats;
  onToggleStat: (key: keyof VisibleStats) => void;
  units: UnitEntry[];
  featuredUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  onClose: () => void;
}) {
  const index = SHOWCASE_TYPES.indexOf(type);
  const go = (delta: number) => {
    const next = SHOWCASE_TYPES[(index + delta + SHOWCASE_TYPES.length) % SHOWCASE_TYPES.length];
    onSwitch(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] max-w-[min(90vw,640px)] flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-white">Showcase preview</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => go(-1)}
            aria-label="Previous showcase"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            ‹
          </button>

          <div className="flex min-h-[300px] flex-1 items-center justify-center">
            {loading || !src ? (
              <div className="flex aspect-square w-full items-center justify-center text-sm text-white/50">
                Rendering…
              </div>
            ) : (
              <img src={src} alt={`${SHOWCASE_LABELS[type]} showcase`} className="max-h-[70vh] w-full rounded-2xl object-contain shadow-2xl" />
            )}
          </div>

          <button
            onClick={() => go(1)}
            aria-label="Next showcase"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            ›
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {SHOWCASE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onSwitch(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                t === type ? "gradient-purple text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {SHOWCASE_LABELS[t]}
            </button>
          ))}
        </div>

        {type === "hero" && (
          <div className="flex flex-col gap-3 rounded-lg bg-white/5 p-3">
            <label className="flex items-center gap-3 text-xs text-white/70">
              <span className="w-20 shrink-0 font-semibold">Unit</span>
              <select
                value={featuredUnitId ?? ""}
                onChange={(e) => onSelectUnit(e.target.value)}
                className="flex-1 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white outline-none"
              >
                <option value="">Auto (best unit)</option>
                {units.map((u) => (
                  <option key={u.UniqueId} value={u.UniqueId}>
                    {u.DisplayName || u.Asset} ({u.Rarity ?? "?"})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <StatCheckbox label="Level" checked={visibleStats.level} onChange={() => onToggleStat("level")} />
              <StatCheckbox label="Gems" checked={visibleStats.gems} onChange={() => onToggleStat("gems")} />
              <StatCheckbox label="Traits" checked={visibleStats.traits} onChange={() => onToggleStat("traits")} />
              <StatCheckbox label="Story completed" checked={visibleStats.story} onChange={() => onToggleStat("story")} />
            </div>

            <p className="text-[11px] font-semibold text-white/50 uppercase">
              Pose art doesn't come framed the same for every unit — adjust it here
            </p>
            <PoseSlider label="Size" min={80} max={350} value={pose.size} onChange={(size) => onAdjustPose({ size })} />
            <PoseSlider label="Horizontal" min={0} max={100} value={pose.x} onChange={(x) => onAdjustPose({ x })} />
            <PoseSlider label="Vertical" min={0} max={100} value={pose.y} onChange={(y) => onAdjustPose({ y })} />
          </div>
        )}

        <button
          onClick={() => src && downloadDataUrl(src, filename)}
          disabled={loading || !src}
          className="gradient-purple rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}

function StatCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/70">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-fuchsia-500" />
      {label}
    </label>
  );
}

function PoseSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-xs text-white/70">
      <span className="w-20 shrink-0 font-semibold">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-fuchsia-500"
      />
      <span className="w-10 shrink-0 text-right tabular-nums">{value}</span>
    </label>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-white/[0.04]">
      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="font-display flex items-center justify-center gap-1.5 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-zinc-400">{children}</p>;
}
