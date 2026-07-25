import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Removes accounts (and their cascaded account_details) from tracking entirely. */
export function useDeleteAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: number[]) => {
      const { error } = await supabase.from("accounts").delete().in("user_id", userIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["all-units"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
