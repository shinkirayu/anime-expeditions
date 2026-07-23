import { useEffect, useState } from "react";

const cache = new Map<string, string>();

/**
 * Fetches `url` and converts it to a base64 data: URL. Used to pre-inline images that
 * html-to-image's own embedding step can't be trusted with — either because the source needs
 * CORS it doesn't send (our asset-icon proxy) or because its embedder is unreliable on large
 * files (observed silently dropping ~800KB unit pose art with no error). A data: `<img src>`
 * is already-inlined, so html-to-image skips embedding it and just uses it as-is.
 */
export function useImageDataUrl(url: string | null | undefined): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(url ? (cache.get(url) ?? null) : null);

  useEffect(() => {
    if (!url) {
      setDataUrl(null);
      return;
    }
    const cached = cache.get(url);
    if (cached) {
      setDataUrl(cached);
      return;
    }
    let cancelled = false;
    fetch(url)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          }),
      )
      .then((result) => {
        if (cancelled) return;
        cache.set(url, result);
        setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return dataUrl;
}
