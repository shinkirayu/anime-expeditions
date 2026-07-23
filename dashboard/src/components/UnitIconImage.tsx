import { useState, type ReactNode } from "react";
import { unitIconImageUrl } from "../lib/unitImages";

/** Unit card icon hotlinked from the community wiki, falling back to `fallback` if missing/broken. */
export function UnitIconImage({
  displayName,
  className = "size-full object-contain",
  fallback = null,
}: {
  displayName?: string | null;
  className?: string;
  fallback?: ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  const src = unitIconImageUrl(displayName);
  if (!src || errored) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={displayName ?? "Unit"}
      className={`inline-block shrink-0 ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  );
}
