const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/** "rbxassetid://12345" (or a bare numeric id) -> our asset-icon proxy URL, or null if unresolvable. */
export function assetIconUrl(rbxAssetId: string | undefined | null, size = "150x150"): string | null {
  if (!rbxAssetId) return null;
  const match = rbxAssetId.match(/\d+/);
  if (!match) return null;
  return `${SUPABASE_URL}/functions/v1/asset-icon?id=${match[0]}&size=${size}`;
}
