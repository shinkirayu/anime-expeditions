import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AccountRow } from "../lib/types";

/**
 * Subscribe to changes on `public.accounts`. RLS already scopes every row to
 * accounts this dashboard user owns, so no extra filter is needed — any event
 * that reaches the client is guaranteed to be one of theirs. On any
 * insert/update, invalidate the list + stats queries so they refetch. This is
 * simpler (and much more reliable) than hand-patching the cache for specific
 * visible rows, at the cost of one extra read per change instead of zero.
 */
export function useAccountsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("accounts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Single-row subscription for the detail page. */
export function useAccountRealtime(userId: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userId == null) return;
    const channel = supabase
      .channel(`account-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` },
        (payload) => {
          queryClient.setQueryData<AccountRow>(["account", userId], (old) =>
            old ? { ...old, ...(payload.new as AccountRow) } : (payload.new as AccountRow),
          );
          // Heavy payload changed too — refetch it lazily next time it's needed.
          queryClient.invalidateQueries({ queryKey: ["account-details", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
