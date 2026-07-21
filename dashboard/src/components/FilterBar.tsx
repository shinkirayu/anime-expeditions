import type { AccountFilters, SortKey } from "../lib/types";
import { SearchIcon } from "./icons";
import { Dropdown } from "./Dropdown";

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
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "gradient-purple border-transparent text-white shadow-[0_0_10px_rgba(129,19,255,0.45)]"
        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-white/5"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInput(e.target.value)}
          placeholder="Search username…"
          aria-label="Search accounts"
          className="w-full rounded-lg border border-zinc-200 bg-transparent py-2 pr-3 pl-9 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700"
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
        <Dropdown<SortKey>
          value={filters.sort}
          options={SORTS}
          onChange={(sort) => onFilters({ ...filters, sort })}
          label="Sort"
          ariaLabel="Sort accounts"
        />
      </div>
    </div>
  );
}
