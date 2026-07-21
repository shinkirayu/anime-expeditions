import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllUnits, type AggregatedUnit } from "../hooks/useAllUnits";
import { rarityClass } from "../lib/format";
import { SearchIcon } from "../components/icons";

const RARITY_ORDER = ["Secret", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

type SortMode = "count" | "rarity" | "name";

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
        <h1 className="text-lg font-bold tracking-tight">Units</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every unit across all of your tracked accounts. Click one to see who has it.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter units…"
            className="w-full rounded-lg border border-zinc-200 bg-transparent py-2 pr-3 pl-9 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort units"
          className="rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs font-medium sm:ml-auto dark:border-zinc-700"
        >
          <option value="count">Sort: Most owned</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          Failed to load units.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No units yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((u) => (
            <button
              key={u.key}
              onClick={() => setSelected(u)}
              className="cv-auto flex flex-col items-start gap-1 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
            >
              <span className="w-full truncate text-sm font-semibold">{u.displayName}</span>
              <span className={`text-xs font-medium ${rarityClass(u.rarity)}`}>{u.rarity ?? "Unknown"}</span>
              {u.element && <span className="text-xs text-zinc-400">{u.element}</span>}
              <span className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {u.owners.length} {u.owners.length === 1 ? "account" : "accounts"}
              </span>
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
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold">{unit.displayName}</h2>
            <p className={`text-xs font-medium ${rarityClass(unit.rarity)}`}>
              {unit.rarity ?? "Unknown"} · {unit.owners.length} accounts
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
          {unit.owners.map((o) => (
            <Link
              key={o.UniqueId}
              to={`/account/${o.user_id}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-800/60 dark:hover:border-indigo-500"
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
