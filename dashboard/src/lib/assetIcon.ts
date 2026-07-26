const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Crow Relic's icon (Shared.Information.Items.CrowRelic.Icon), hardcoded as a
 * fallback — tracked accounts only report a currency entry once they've
 * actually earned at least one, so most rows have no `Icon` from live data
 * yet even though the item (and its icon) already exists in-game.
 */
export const CROW_RELIC_ICON = "rbxassetid://76923936793147";

/** "rbxassetid://12345" (or a bare numeric id) -> our asset-icon proxy URL, or null if unresolvable. */
export function assetIconUrl(rbxAssetId: string | undefined | null, size = "150x150"): string | null {
  if (!rbxAssetId) return null;
  const match = rbxAssetId.match(/\d+/);
  if (!match) return null;
  return `${SUPABASE_URL}/functions/v1/asset-icon?id=${match[0]}&size=${size}`;
}
