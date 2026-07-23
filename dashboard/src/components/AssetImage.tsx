import { useState, type ReactNode } from "react";
import { assetIconUrl } from "../lib/assetIcon";

/** Real Roblox asset icon via the asset-icon proxy, falling back to `fallback` if missing/broken. */
export function AssetImage({
  rbxAssetId,
  src: srcOverride,
  alt,
  className = "size-4 shrink-0 object-contain",
  fallback = null,
}: {
  rbxAssetId?: string | null;
  /** Direct image URL, tried before `rbxAssetId` — e.g. a wiki icon that doesn't need the Roblox proxy. */
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  const src = srcOverride ?? assetIconUrl(rbxAssetId);
  if (!src || errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block ${className}`}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
