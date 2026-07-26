import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllUnits, type AggregatedUnit, type OwnedUnit } from "../hooks/useAllUnits";
import { useAccount, useAccountDetails } from "../hooks/useAccountDetail";
import { useDeleteAccounts } from "../hooks/useDeleteAccounts";
import { RARITY_ORDER, rarityBoxStyle, rarityClass } from "../lib/format";
import { ensureWarning } from "../lib/eldorado";
import { buildDefaultDescription, buildDefaultTitle } from "../lib/eldoradoDescribe";
import { StarIcon, SwordIcon } from "../components/icons";
import { CloseButton } from "../components/CloseButton";
import { EldoradoListingModal } from "../components/EldoradoListingModal";
import { ZeusXListingModal } from "../components/ZeusXListingModal";
import { UnitIconImage } from "../components/UnitIconImage";

export default function UnitsPage() {
  const { data: units, isLoading, isError } = useAllUnits();
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<AggregatedUnit | null>(null);

  const filtered = useMemo(() => {
    const all = units ?? [];
    const list = rarityFilter ? all.filter((u) => u.rarity === rarityFilter) : all.slice();

    return list.sort((a, b) => {
      const ai = RARITY_ORDER.indexOf(a.rarity ?? "");
      const bi = RARITY_ORDER.indexOf(b.rarity ?? "");
      const rarityDiff = (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return rarityDiff !== 0 ? rarityDiff : a.displayName.localeCompare(b.displayName);
    });
  }, [units, rarityFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Units</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every unit across all of your tracked accounts. Click one to see who has it.
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          onClick={() => setRarityFilter(null)}
          className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
            rarityFilter === null
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
              : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/25"
          }`}
        >
          All
        </button>
        {RARITY_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRarityFilter((cur) => (cur === r ? null : r))}
            style={rarityBoxStyle(r)}
            className={`font-display text-outline rounded-md px-3 py-1 text-xs font-bold text-white transition-all ${
              rarityFilter === r ? "scale-105 opacity-100 ring-2 ring-white/90" : "opacity-60 hover:opacity-90"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          Failed to load units.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-fuchsia-500/15">
          No units yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {filtered.map((u) => (
            <button
              key={u.key}
              onClick={() => setSelected(u)}
              style={rarityBoxStyle(u.rarity)}
              className="relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-[11px] p-1.5 text-left transition-transform hover:scale-[1.05]"
            >
              <UnitIconImage
                displayName={u.displayName}
                className="absolute inset-0 translate-y-[-2%] object-cover opacity-90 [clip-path:inset(0_0_0%_0)]"
                fallback={
                  <SwordIcon className="mt-3 size-5 text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                }
              />
              <span className="font-display relative self-start rounded bg-black/50 px-1 py-0.5 text-[10px] leading-none font-bold text-white">
                {u.owners.length}
              </span>
              {u.displayName.includes("(") && (
                <span className="absolute top-1 right-1 flex gap-px text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">
                  <StarIcon className="size-2.5" />
                  <StarIcon className="size-2.5" />
                  <StarIcon className="size-2.5" />
                </span>
              )}
              <div className="relative mt-auto w-full bg-gradient-to-t from-black/70 to-transparent text-center">
                <div className="font-display text-outline truncate text-[11px] font-semibold">
                  {u.displayName}
                </div>
                <div className="truncate text-[8px] font-semibold text-white/85">
                  {u.rarity ?? "Unknown"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <UnitOwnersModal unit={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

interface GroupedOwner {
  key: string;
  account: OwnedUnit;
  count: number;
  equippedAny: boolean;
}

/**
 * Same account can own several copies of this unit. Combine copies into one
 * row unless they differ in Trait or Level — those differences are the only
 * ones worth calling out separately.
 */
function groupOwners(owners: OwnedUnit[]): GroupedOwner[] {
  const map = new Map<string, GroupedOwner>();
  for (const o of owners) {
    const key = `${o.user_id}::${o.Level ?? ""}::${o.Trait?.DisplayName ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (o.Equipped) existing.equippedAny = true;
    } else {
      map.set(key, { key, account: o, count: 1, equippedAny: !!o.Equipped });
    }
  }
  return Array.from(map.values());
}

function UnitOwnersModal({ unit, onClose }: { unit: AggregatedUnit; onClose: () => void }) {
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [eldoradoOpen, setEldoradoOpen] = useState(false);
  const [zeusxOpen, setZeusxOpen] = useState(false);
  const deleteAccounts = useDeleteAccounts();

  // Only fetch full account data (for the showcase auto-attach) when exactly one account is selected.
  const soloUserId = selected.size === 1 ? [...selected][0] : null;
  const soloAccount = useAccount(soloUserId);
  const soloDetails = useAccountDetails(soloUserId);

  const activeOwners = useMemo(
    () => unit.owners.filter((o) => !removedIds.has(o.user_id)),
    [unit.owners, removedIds],
  );
  const groupedOwners = useMemo(() => groupOwners(activeOwners), [activeOwners]);
  const accountCount = useMemo(
    () => new Set(activeOwners.map((o) => o.user_id)).size,
    [activeOwners],
  );
  const usernameByUserId = useMemo(() => {
    const map = new Map<number, string>();
    for (const o of activeOwners) if (!map.has(o.user_id)) map.set(o.user_id, o.username);
    return map;
  }, [activeOwners]);

  function toggleOne(userId: number, index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setLastIndex(index);
  }

  function handleRowClick(e: React.MouseEvent, index: number, userId: number) {
    if (e.shiftKey) {
      e.preventDefault();
      const anchor = lastIndex ?? index;
      const [start, end] = anchor < index ? [anchor, index] : [index, anchor];
      const ids = groupedOwners.slice(start, end + 1).map((g) => g.account.user_id);
      setSelected((prev) => new Set([...prev, ...ids]));
      setLastIndex(index);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleOne(userId, index);
    }
  }

  function handleCopy() {
    const names = [...selected].map((id) => usernameByUserId.get(id)).filter((n): n is string => !!n);
    if (names.length === 0) return;
    navigator.clipboard.writeText(names.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function buildEldoradoAccounts(): string[] {
    return [...selected]
      .map((id) => usernameByUserId.get(id))
      .filter((n): n is string => !!n)
      .map((username) => ensureWarning(`Roblox username: ${username}\nUser: \nPass: `));
  }

  function handleDelete() {
    const ids = [...selected];
    const names = ids.map((id) => usernameByUserId.get(id)).filter((n): n is string => !!n);
    const ok = window.confirm(
      `Stop tracking ${ids.length} account${ids.length > 1 ? "s" : ""}?\n\n${names.join(", ")}\n\nThis removes them from the dashboard entirely and cannot be undone.`,
    );
    if (!ok) return;
    deleteAccounts.mutate(ids, {
      onSuccess: () => {
        setRemovedIds((prev) => new Set([...prev, ...ids]));
        setSelected(new Set());
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <div className="flex items-center gap-3">
            <div
              style={rarityBoxStyle(unit.rarity)}
              className="size-12 shrink-0 overflow-hidden rounded-[11px] p-1"
            >
              <UnitIconImage
                displayName={unit.displayName}
                fallback={<SwordIcon className="m-auto mt-3 size-5 text-white/85" />}
              />
            </div>
            <div>
              <h2 className="font-display font-semibold">{unit.displayName}</h2>
              <p className={`text-xs font-medium ${rarityClass(unit.rarity)}`}>
                {unit.rarity ?? "Unknown"} · {accountCount} accounts
              </p>
            </div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-fuchsia-200 bg-fuchsia-50 px-4 py-2 dark:border-fuchsia-500/15 dark:bg-fuchsia-500/10">
            <span className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEldoradoOpen(true)}
                className="rounded-md border border-fuchsia-300 bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-600 transition-colors hover:border-fuchsia-400 dark:border-fuchsia-500/40 dark:bg-white/5 dark:text-fuchsia-400"
              >
                List on Eldorado
              </button>
              <button
                onClick={() => setZeusxOpen(true)}
                className="rounded-md border border-fuchsia-300 bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-600 transition-colors hover:border-fuchsia-400 dark:border-fuchsia-500/40 dark:bg-white/5 dark:text-fuchsia-400"
              >
                List on ZeusX
              </button>
              <button
                onClick={handleCopy}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-fuchsia-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
              >
                {copied ? "Copied!" : "Copy usernames"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteAccounts.isPending}
                className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 transition-colors hover:border-red-400 disabled:opacity-50 dark:border-red-500/25 dark:bg-white/5 dark:text-red-400"
              >
                {deleteAccounts.isPending ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
          {groupedOwners.length === 0 ? (
            <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">No accounts left.</p>
          ) : (
            groupedOwners.map(({ key, account: o, count, equippedAny }, index) => (
              <Link
                key={key}
                to={`/account/${o.user_id}`}
                onClick={(e) => handleRowClick(e, index, o.user_id)}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selected.has(o.user_id)
                    ? "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
                    : "border-zinc-200 bg-zinc-50 hover:border-fuchsia-400 dark:border-white/5 dark:bg-white/[0.04] dark:hover:border-fuchsia-500/50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(o.user_id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(o.user_id, index)}
                    className="size-3.5 shrink-0 accent-fuchsia-500"
                    aria-label={`Select ${o.username}`}
                  />
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate font-medium">{o.display_name || o.username}</span>
                    {o.Trait?.DisplayName && (
                      <span className={`shrink-0 truncate text-[11px] font-medium ${rarityClass(o.Trait.Rarity)}`}>
                        · {o.Trait.DisplayName}
                      </span>
                    )}
                  </span>
                </span>
                <span className="ml-2 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                  Lv {o.Level ?? "—"} {equippedAny ? "· equipped" : ""} {count > 1 ? `×${count}` : ""}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {eldoradoOpen && (
        <EldoradoListingModal
          initialTitle={
            soloAccount.data ? buildDefaultTitle(soloAccount.data) : `${unit.displayName} owners — ${selected.size || accountCount} accounts`
          }
          initialDescription={
            soloAccount.data
              ? buildDefaultDescription(soloAccount.data, soloDetails.data)
              : `Anime Expeditions accounts that own ${unit.displayName}${unit.rarity ? ` (${unit.rarity})` : ""}.`
          }
          initialAccounts={selected.size > 0 ? buildEldoradoAccounts() : undefined}
          showcaseAccount={soloAccount.data ? { account: soloAccount.data, details: soloDetails.data } : undefined}
          onClose={() => setEldoradoOpen(false)}
        />
      )}

      {zeusxOpen && (
        <ZeusXListingModal
          initialTitle={
            soloAccount.data ? buildDefaultTitle(soloAccount.data) : `${unit.displayName} owners — ${selected.size || accountCount} accounts`
          }
          initialDescription={
            soloAccount.data
              ? buildDefaultDescription(soloAccount.data, soloDetails.data)
              : `Anime Expeditions accounts that own ${unit.displayName}${unit.rarity ? ` (${unit.rarity})` : ""}.`
          }
          showcaseAccount={soloAccount.data ? { account: soloAccount.data, details: soloDetails.data } : undefined}
          onClose={() => setZeusxOpen(false)}
        />
      )}
    </div>
  );
}
