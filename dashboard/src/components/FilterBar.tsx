import type { AccountFilters, SortKey } from "../lib/types";

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
        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        placeholder="Search username…"
        aria-label="Search accounts"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:max-w-xs dark:border-zinc-800 dark:bg-zinc-900"
      />
      <div className="flex flex-wrap items-center gap-2">
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
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900"
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
