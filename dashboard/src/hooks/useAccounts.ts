import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { REFRESH } from "../lib/queryClient";
import {
  ACCOUNT_LIST_COLUMNS,
  ONLINE_WINDOW_MS,
  PAGE_SIZE,
  type AccountFilters,
  type AccountListRow,
  type DashboardStats,
} from "../lib/types";

export const accountsKey = (f: AccountFilters) =>
  ["accounts", f.search, f.sort, f.onlineOnly, f.inMatchOnly] as const;

async function fetchAccountsPage(
  filters: AccountFilters,
  page: number,
): Promise<{ rows: AccountListRow[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  // Request one extra row to learn hasMore without a separate count query.
  const to = from + PAGE_SIZE;

  let q = supabase.from("accounts").select(ACCOUNT_LIST_COLUMNS).range(from, to);

  if (filters.search) {
    const term = filters.search.replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }
  if (filters.onlineOnly) {
    q = q.gte("last_seen", new Date(Date.now() - ONLINE_WINDOW_MS).toISOString());
  }
  if (filters.inMatchOnly) {
    q = q.eq("in_match", true);
  }

  switch (filters.sort) {
    case "level":
      q = q.order("level", { ascending: false, nullsFirst: false });
      break;
    case "exp":
      q = q.order("exp", { ascending: false, nullsFirst: false });
      break;
    case "username":
      q = q.order("username", { ascending: true });
      break;
    default:
      q = q.order("last_seen", { ascending: false });
  }
  // Stable tiebreaker so pagination never duplicates rows.
  q = q.order("user_id", { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as AccountListRow[];
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export function useAccounts(filters: AccountFilters) {
  return useInfiniteQuery({
    queryKey: accountsKey(filters),
    queryFn: ({ pageParam }) => fetchAccountsPage(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
    refetchInterval: REFRESH.accounts,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as DashboardStats;
    },
    refetchInterval: REFRESH.stats,
  });
}
