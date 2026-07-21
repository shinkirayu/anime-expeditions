import { QueryClient } from "@tanstack/react-query";

/** Refresh intervals — tune these to trade freshness for bandwidth. */
export const REFRESH = {
  /** Account list background refetch (ms). Realtime patches rows in between. */
  accounts: 60_000,
  /** Header stat tiles (ms). */
  stats: 60_000,
  /** Heavy detail payload — no background polling; realtime + manual only. */
  details: Infinity,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive caching: data is considered fresh for 30s, so remounts and
      // route transitions never duplicate in-flight or recent requests.
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Retry with exponential backoff: 1s, 2s, 4s (capped).
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
