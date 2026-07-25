import { useQuery } from "@tanstack/react-query";
import { fetchAccountGames } from "../lib/eldorado";

/** Eldorado's public Account-category game catalog — fetched once, cached forever. */
export function useEldoradoGames(enabled: boolean) {
  return useQuery({
    queryKey: ["eldorado-games"],
    queryFn: fetchAccountGames,
    enabled,
    staleTime: Infinity,
    retry: 1,
  });
}
