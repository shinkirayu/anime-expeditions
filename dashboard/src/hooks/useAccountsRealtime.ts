import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AccountFilters, AccountListRow, AccountRow } from "../lib/types";
import { accountsKey } from "./useAccounts";

type Page = { rows: AccountListRow[]; hasMore: boolean };

/**
 * Subscribe to postgres_changes for ONLY the rows currently on screen.
 * Events patch the query cache in place — zero extra reads per update.
 * The subscription re-arms (debounced) when the visible id set changes,
 * and detaches entirely while the tab is hidden.
 */
export function useAccountsRealtime(filters: AccountFilters, visibleIds: number[]) {
  const queryClient = useQueryClient();
  const idsSignature = visibleIds.slice().sort((a, b) => a - b).join(",");

  useEffect(() => {
    if (!idsSignature) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      channel = supabase
        .channel(`accounts-visible`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "accounts",
            filter: `user_id=in.(${idsSignature})`,
          },
          (payload) => {
            const updated = payload.new as AccountListRow;
            queryClient.setQueryData<InfiniteData<Page>>(accountsKey(filters), (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  rows: page.rows.map((r) =>
                    r.user_id === updated.user_id ? { ...r, ...updated } : r,
                  ),
                })),
              };
            });
          },
        )
        .subscribe();
    };

    const teardown = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) teardown();
      else if (!channel) subscribe();
    };

    // Debounce (re)subscription so rapid scrolling doesn't churn channels.
    const t = setTimeout(() => {
      if (!document.hidden) subscribe();
    }, 500);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
      teardown();
    };
  }, [idsSignature, filters, queryClient]);
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
