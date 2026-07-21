import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { UnitEntry } from "../lib/types";

export interface OwnedUnit extends UnitEntry {
  user_id: number;
  username: string;
  display_name: string | null;
}

export interface AggregatedUnit {
  key: string;
  displayName: string;
  rarity?: string;
  element?: string;
  archetype?: string;
  owners: OwnedUnit[];
}

interface DetailsWithAccount {
  user_id: number;
  units: UnitEntry[];
  accounts: { username: string; display_name: string | null } | null;
}

/**
 * RLS already scopes account_details to accounts this dashboard user owns, so
 * this is a small, bounded fetch (your own tracked accounts, not everyone's) —
 * safe to pull in full and aggregate client-side.
 */
export function useAllUnits() {
  return useQuery({
    queryKey: ["all-units"],
    queryFn: async (): Promise<AggregatedUnit[]> => {
      const { data, error } = await supabase
        .from("account_details")
        .select("user_id,units,accounts(username,display_name)");
      if (error) throw error;

      const rows = (data ?? []) as unknown as DetailsWithAccount[];
      const groups = new Map<string, AggregatedUnit>();

      for (const row of rows) {
        if (!row.accounts) continue;
        for (const unit of row.units ?? []) {
          const key = unit.DisplayName || unit.Asset || "Unknown";
          let group = groups.get(key);
          if (!group) {
            group = {
              key,
              displayName: key,
              rarity: unit.Rarity,
              element: unit.Element,
              archetype: unit.Archetype,
              owners: [],
            };
            groups.set(key, group);
          }
          group.owners.push({
            ...unit,
            user_id: row.user_id,
            username: row.accounts.username,
            display_name: row.accounts.display_name,
          });
        }
      }

      return Array.from(groups.values()).sort((a, b) => b.owners.length - a.owners.length);
    },
  });
}
