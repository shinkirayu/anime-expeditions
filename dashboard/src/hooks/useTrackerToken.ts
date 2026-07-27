import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** Invalidates the current token and mints a new one — any script using the old one stops working immediately. */
export function useRegenerateTrackerToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("regenerate_my_tracker_token");
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => {
      queryClient.setQueryData(["tracker-token"], token);
    },
  });
}
