import { useEffect, useMemo, useRef, useState } from "react";
import { useAccounts, useDashboardStats } from "../hooks/useAccounts";
import { useAccountsRealtime } from "../hooks/useAccountsRealtime";
import { useDebounce } from "../hooks/useDebounce";
import type { AccountFilters } from "../lib/types";
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

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAccounts(effectiveFilters);
  const stats = useDashboardStats();

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
      />

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
          {/* Below md, a 12-column table can only ever scroll sideways — stack cards instead. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            {accounts.map((a) => (
              <AccountCard key={a.user_id} account={a} onShowInventory={setInventoryFor} onShowUnits={setUnitsFor} />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-sm md:block dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
            <table className="w-full min-w-[900px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[5%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] tracking-wide text-fuchsia-700/70 uppercase dark:border-fuchsia-500/10 dark:text-fuchsia-300/60">
                  <th className="py-3 pr-3 pl-4 font-semibold">Account</th>
                  <th className="px-3 py-3 text-center font-semibold">Level</th>
                  <th className="px-3 py-3 text-center font-semibold">Gems</th>
                  <th className="px-3 py-3 text-center font-semibold">Trait Crystal</th>
                  <th className="px-3 py-3 text-center font-semibold">Crow Relic</th>
                  <th className="px-3 py-3 text-center font-semibold">Villain Coins</th>
                  <th className="px-3 py-3 text-center font-semibold">Story</th>
                  <th className="px-3 py-3 text-center font-semibold">Raid</th>
                  <th className="px-3 py-3 text-center font-semibold">Villain</th>
                  <th className="px-3 py-3 text-center font-semibold">Units</th>
                  <th className="px-3 py-3 text-center font-semibold">Items</th>
                  <th className="px-3 py-3 text-center font-semibold">Location</th>
                  <th className="py-3 pr-4 pl-3 text-right font-semibold">Last update</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <AccountRow
                    key={a.user_id}
                    account={a}
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
