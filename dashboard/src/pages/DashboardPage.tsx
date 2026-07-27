import { useEffect, useMemo, useRef, useState } from "react";
import { useAccounts, useDashboardStats } from "../hooks/useAccounts";
import { useAccountsRealtime } from "../hooks/useAccountsRealtime";
import { useDeleteAccounts } from "../hooks/useDeleteAccounts";
import { useDebounce } from "../hooks/useDebounce";
import type { AccountFilters } from "../lib/types";
import { loadColumnPrefs, saveColumnPrefs, type ColumnPrefs } from "../lib/columnPrefs";
import { AccountRow } from "../components/AccountRow";
import { AccountCard } from "../components/AccountCard";
import { InventoryModal } from "../components/InventoryModal";
import { UnitsModal } from "../components/UnitsModal";
import { FilterBar } from "../components/FilterBar";
import { StatTiles } from "../components/StatTiles";
import { SkeletonGrid, SkeletonTiles } from "../components/Skeletons";

export default function DashboardPage() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filters, setFilters] = useState<AccountFilters>({
    search: "",
    sort: "username",
    onlineOnly: false,
    inMatchOnly: false,
  });
  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch.trim() }),
    [filters, debouncedSearch],
  );

  const [columns, setColumns] = useState<ColumnPrefs>(() => loadColumnPrefs());
  useEffect(() => saveColumnPrefs(columns), [columns]);

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAccounts(effectiveFilters);
  const stats = useDashboardStats();
  const deleteAccounts = useDeleteAccounts();

  const accounts = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  useAccountsRealtime();

  const hasActiveFilters = filters.onlineOnly || filters.inMatchOnly || effectiveFilters.search.length > 0;
  function clearFilters() {
    setSearchInput("");
    setFilters({ search: "", sort: filters.sort, onlineOnly: false, inMatchOnly: false });
  }

  const [inventoryFor, setInventoryFor] = useState<number | null>(null);
  const inventoryAccount = useMemo(
    () => accounts.find((a) => a.user_id === inventoryFor) ?? null,
    [accounts, inventoryFor],
  );

  const [unitsFor, setUnitsFor] = useState<number | null>(null);
  const unitsAccount = useMemo(
    () => accounts.find((a) => a.user_id === unitsFor) ?? null,
    [accounts, unitsFor],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  function toggleSelect(userId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function handleDelete() {
    const ids = [...selected];
    const names = ids
      .map((id) => accounts.find((a) => a.user_id === id)?.username)
      .filter((n): n is string => !!n);
    const ok = window.confirm(
      `Stop tracking ${ids.length} account${ids.length > 1 ? "s" : ""}?\n\n${names.join(", ")}\n\nThis removes them from the dashboard entirely and cannot be undone.`,
    );
    if (!ok) return;
    deleteAccounts.mutate(ids, { onSuccess: () => setSelected(new Set()) });
  }

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="space-y-6">
      {stats.data ? <StatTiles stats={stats.data} /> : <SkeletonTiles />}

      <FilterBar
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        filters={filters}
        onFilters={setFilters}
        onClear={clearFilters}
        loadedCount={accounts.length}
        columns={columns}
        onColumns={setColumns}
      />

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 dark:border-fuchsia-500/15 dark:bg-fuchsia-500/10">
          <span className="text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleteAccounts.isPending}
              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:border-red-400 disabled:opacity-50 dark:border-red-500/25 dark:bg-white/5 dark:text-red-400"
            >
              {deleteAccounts.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
          Failed to load accounts: {(error as Error)?.message}
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid />
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-fuchsia-500/15">
          {hasActiveFilters ? (
            <>
              <p>No accounts match your current filters.</p>
              <button
                onClick={clearFilters}
                className="mt-3 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                Clear filters
              </button>
            </>
          ) : (
            "No accounts yet. Waiting for trackers to report in…"
          )}
        </div>
      ) : (
        <>
          {/* Below md, a wide table can only ever scroll sideways — stack cards instead. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {accounts.map((a) => (
              <AccountCard
                key={a.user_id}
                account={a}
                columns={columns}
                selected={selected.has(a.user_id)}
                onToggleSelect={toggleSelect}
                onShowInventory={setInventoryFor}
                onShowUnits={setUnitsFor}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm md:block dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
            <table className="w-full min-w-[900px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[15%]" />
                <col className="w-[5%]" />
                {columns.gems && <col className="w-[6%]" />}
                {columns.traitCrystal && <col className="w-[6%]" />}
                {columns.crowRelic && <col className="w-[6%]" />}
                {columns.villainCoins && <col className="w-[6%]" />}
                {columns.standardPity && <col className="w-[6%]" />}
                {columns.villainPity && <col className="w-[6%]" />}
                {columns.story && <col className="w-[7%]" />}
                {columns.raid && <col className="w-[6%]" />}
                {columns.villain && <col className="w-[6%]" />}
                {columns.unitsButton && <col className="w-[7%]" />}
                {columns.itemsButton && <col className="w-[7%]" />}
                {columns.location && <col className="w-[12%]" />}
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] tracking-wide text-fuchsia-700/70 uppercase dark:border-fuchsia-500/10 dark:text-fuchsia-300/60">
                  <th className="py-3 pr-0 pl-4 font-semibold">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="py-3 pr-3 pl-3 font-semibold">Account</th>
                  <th className="px-3 py-3 text-center font-semibold">Level</th>
                  {columns.gems && <th className="px-3 py-3 text-center font-semibold">Gems</th>}
                  {columns.traitCrystal && <th className="px-3 py-3 text-center font-semibold">Trait Crystal</th>}
                  {columns.crowRelic && <th className="px-3 py-3 text-center font-semibold">Crow Relic</th>}
                  {columns.villainCoins && <th className="px-3 py-3 text-center font-semibold">Villain Coins</th>}
                  {columns.standardPity && <th className="px-3 py-3 text-center font-semibold">Standard Pity</th>}
                  {columns.villainPity && <th className="px-3 py-3 text-center font-semibold">Villain Pity</th>}
                  {columns.story && <th className="px-3 py-3 text-center font-semibold">Story</th>}
                  {columns.raid && <th className="px-3 py-3 text-center font-semibold">Raid</th>}
                  {columns.villain && <th className="px-3 py-3 text-center font-semibold">Villain</th>}
                  {columns.unitsButton && <th className="px-3 py-3 text-center font-semibold">Units</th>}
                  {columns.itemsButton && <th className="px-3 py-3 text-center font-semibold">Items</th>}
                  {columns.location && <th className="px-3 py-3 text-center font-semibold">Location</th>}
                  <th className="py-3 pr-4 pl-3 text-right font-semibold">Last update</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <AccountRow
                    key={a.user_id}
                    account={a}
                    columns={columns}
                    selected={selected.has(a.user_id)}
                    onToggleSelect={toggleSelect}
                    onShowInventory={setInventoryFor}
                    onShowUnits={setUnitsFor}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && <SkeletonGrid count={3} />}
        </>
      )}

      {inventoryAccount && (
        <InventoryModal account={inventoryAccount} onClose={() => setInventoryFor(null)} />
      )}
      {unitsAccount && <UnitsModal account={unitsAccount} onClose={() => setUnitsFor(null)} />}
    </div>
  );
}
