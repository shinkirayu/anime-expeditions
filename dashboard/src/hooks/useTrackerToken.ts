import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Each dashboard user has exactly one tracker token, lazily issued on first call. */
export function useTrackerToken() {
  return useQuery({
    queryKey: ["tracker-token"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_my_tracker_token");
      if (error) throw error;
      return data as string;
    },
    staleTime: Infinity,
  });
}
