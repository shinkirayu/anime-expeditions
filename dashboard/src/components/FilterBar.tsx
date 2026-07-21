import type { AccountFilters, SortKey } from "../lib/types";
import { SearchIcon } from "./icons";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "last_seen", label: "Last seen" },
  { value: "level", label: "Level" },
  { value: "exp", label: "EXP" },
  { value: "username", label: "Name" },
];

interface Props {
  searchInput: string;
  onSearchInput: (v: string) => void;
  filters: AccountFilters;
  onFilters: (f: AccountFilters) => void;
}

export function FilterBar({ searchInput, onSearchInput, filters, onFilters }: Props) {
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-300"
        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Search username…"
          aria-label="Search accounts"
          className="w-full rounded-lg border border-zinc-200 bg-transparent py-2 pr-3 pl-9 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <button
          className={chip(filters.onlineOnly)}
          onClick={() => onFilters({ ...filters, onlineOnly: !filters.onlineOnly })}
        >
          Online only
        </button>
        <button
          className={chip(filters.inMatchOnly)}
          onClick={() => onFilters({ ...filters, inMatchOnly: !filters.inMatchOnly })}
        >
          In match
        </button>
        <select
          value={filters.sort}
          onChange={(e) => onFilters({ ...filters, sort: e.target.value as SortKey })}
          aria-label="Sort accounts"
          className="rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs font-medium dark:border-zinc-700"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
