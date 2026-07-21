import { useEffect, useMemo, useRef, useState } from "react";
import { useAccounts, useDashboardStats } from "../hooks/useAccounts";
import { useAccountsRealtime } from "../hooks/useAccountsRealtime";
import { useDebounce } from "../hooks/useDebounce";
import type { AccountFilters } from "../lib/types";
import { AccountCard } from "../components/AccountCard";
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accounts.map((a) => (
              <AccountCard key={a.user_id} account={a} />
            ))}
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
    </div>
  );
}
