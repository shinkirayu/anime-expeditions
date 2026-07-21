import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { REFRESH } from "../lib/queryClient";
import type { AccountDetailsRow, AccountRow } from "../lib/types";

/** Light row for the detail header — cheap, cached separately from the list. */
export function useAccount(userId: number | null) {
  return useQuery({
    queryKey: ["account", userId],
    enabled: userId != null,
    queryFn: async (): Promise<AccountRow> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data as AccountRow;
    },
  });
}

/**
 * Heavy payload (units + inventory) — lazily fetched only when the detail
 * page mounts, never polled in the background.
 */
export function useAccountDetails(userId: number | null) {
  return useQuery({
    queryKey: ["account-details", userId],
    enabled: userId != null,
    staleTime: 60_000,
    refetchInterval: REFRESH.details === Infinity ? false : REFRESH.details,
    queryFn: async (): Promise<AccountDetailsRow | null> => {
      const { data, error } = await supabase
        .from("account_details")
        .select("user_id,units,inventory,updated_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as AccountDetailsRow | null;
    },
  });
}
