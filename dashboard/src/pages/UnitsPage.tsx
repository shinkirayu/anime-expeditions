import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllUnits, type AggregatedUnit } from "../hooks/useAllUnits";
import { rarityCardBg, rarityClass } from "../lib/format";
import { SearchIcon, SwordIcon } from "../components/icons";
import { Dropdown } from "../components/Dropdown";
import { CloseButton } from "../components/CloseButton";

const RARITY_ORDER = ["Secret", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

type SortMode = "count" | "rarity" | "name";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "count", label: "Most owned" },
  { value: "rarity", label: "Rarity" },
  { value: "name", label: "Name" },
];

export default function UnitsPage() {
  const { data: units, isLoading, isError } = useAllUnits();
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("count");
  const [selected, setSelected] = useState<AggregatedUnit | null>(null);

  const filtered = useMemo(() => {
    const all = units ?? [];
    const term = filter.trim().toLowerCase();
    const list = (
      term
        ? all.filter((u) => `${u.displayName} ${u.rarity ?? ""} ${u.element ?? ""}`.toLowerCase().includes(term))
        : all.slice()
    );

    return list.sort((a, b) => {
      if (sort === "rarity") {
        const ai = RARITY_ORDER.indexOf(a.rarity ?? "");
        const bi = RARITY_ORDER.indexOf(b.rarity ?? "");
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }
      if (sort === "name") return a.displayName.localeCompare(b.displayName);
      return b.owners.length - a.owners.length;
    });
  }, [units, filter, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">Units</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every unit across all of your tracked accounts. Click one to see who has it.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter units…"
            className="w-full rounded-lg border border-zinc-200 bg-transparent py-2 pr-3 pl-9 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700"
          />
        </div>
        <div className="sm:ml-auto">
          <Dropdown<SortMode>
            value={sort}
            options={SORT_OPTIONS}
            onChange={setSort}
            label="Sort"
            ariaLabel="Sort units"
          />
        </div>
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
              className={`relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-xl border-2 bg-gradient-to-b p-1.5 text-left shadow-sm transition-transform hover:scale-[1.05] hover:shadow-[0_0_12px_rgba(129,19,255,0.35)] ${rarityCardBg(u.rarity)}`}
            >
              <span className="font-display self-start rounded bg-black/50 px-1 py-0.5 text-[10px] leading-none font-bold text-white">
                {u.owners.length}
              </span>
              <SwordIcon className="size-5 text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              <div className="w-full text-center">
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

function UnitOwnersModal({ unit, onClose }: { unit: AggregatedUnit; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <div>
            <h2 className="font-display font-semibold">{unit.displayName}</h2>
            <p className={`text-xs font-medium ${rarityClass(unit.rarity)}`}>
              {unit.rarity ?? "Unknown"} · {unit.owners.length} accounts
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
          {unit.owners.map((o) => (
            <Link
              key={o.UniqueId}
              to={`/account/${o.user_id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm transition-colors hover:border-fuchsia-400 dark:border-white/5 dark:bg-white/[0.04] dark:hover:border-fuchsia-500/50"
            >
              <span className="truncate font-medium">{o.display_name || o.username}</span>
              <span className="ml-2 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                Lv {o.Level ?? "—"} {o.Equipped ? "· equipped" : ""}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
