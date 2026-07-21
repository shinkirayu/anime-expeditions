import { useState, type ReactNode } from "react";
import { assetIconUrl } from "../lib/assetIcon";

/** Real Roblox asset icon via the asset-icon proxy, falling back to `fallback` if missing/broken. */
export function AssetImage({
  rbxAssetId,
  alt,
  className = "size-4",
  fallback = null,
}: {
  rbxAssetId?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  const src = assetIconUrl(rbxAssetId);
  if (!src || errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block shrink-0 object-contain ${className}`}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
