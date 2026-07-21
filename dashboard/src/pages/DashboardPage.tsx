import { useEffect, useMemo, useRef, useState } from "react";
import { useAccounts, useDashboardStats } from "../hooks/useAccounts";
import { useAccountsRealtime } from "../hooks/useAccountsRealtime";
import { useDebounce } from "../hooks/useDebounce";
import type { AccountFilters } from "../lib/types";
import { AccountRow } from "../components/AccountRow";
import { InventoryModal } from "../components/InventoryModal";
import { FilterBar } from "../components/FilterBar";
import { StatTiles } from "../components/StatTiles";
import { SkeletonGrid, SkeletonTiles } from "../components/Skeletons";
import { BarChart } from "../components/BarChart";

export default function DashboardPage() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filters, setFilters] = useState<AccountFilters>({
    search: "",
    sort: "last_seen",
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
  const visibleIds = useMemo(() => accounts.map((a) => a.user_id), [accounts]);
  useAccountsRealtime(effectiveFilters, visibleIds);

  const [inventoryFor, setInventoryFor] = useState<number | null>(null);
  const inventoryAccount = useMemo(
    () => accounts.find((a) => a.user_id === inventoryFor) ?? null,
    [accounts, inventoryFor],
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

  const levelDistribution = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const a of accounts) {
      const lvl = a.level ?? 0;
      const bucket = `${Math.floor(lvl / 10) * 10}–${Math.floor(lvl / 10) * 10 + 9}`;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return Array.from(buckets, ([label, value]) => ({ label: `Lv ${label}`, value })).sort(
      (a, b) => parseInt(a.label.slice(3)) - parseInt(b.label.slice(3)),
    );
  }, [accounts]);

  return (
    <div className="space-y-5">
      {stats.data ? <StatTiles stats={stats.data} /> : <SkeletonTiles />}

      <FilterBar
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        filters={filters}
        onFilters={setFilters}
      />

      {isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Failed to load accounts: {(error as Error)?.message}
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid />
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No accounts match. Waiting for trackers to report in…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <th className="py-2 pl-3 pr-2 font-medium">Account</th>
                  <th className="px-2 py-2 text-right font-medium">Level</th>
                  <th className="px-2 py-2 text-right font-medium">Gems</th>
                  <th className="px-2 py-2 text-right font-medium">Units</th>
                  <th className="px-2 py-2 text-right font-medium">Items</th>
                  <th className="px-2 py-2 text-right font-medium">Last seen</th>
                  <th className="py-2 pr-3 pl-2" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <AccountRow key={a.user_id} account={a} onShowInventory={setInventoryFor} />
                ))}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && <SkeletonGrid count={3} />}
        </>
      )}

      {accounts.length > 3 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChart title="Level distribution (loaded accounts)" data={levelDistribution} />
        </div>
      )}

      {inventoryAccount && (
        <InventoryModal account={inventoryAccount} onClose={() => setInventoryFor(null)} />
      )}
    </div>
  );
}
