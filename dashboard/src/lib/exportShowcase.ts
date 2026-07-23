import { toPng } from "html-to-image";

/** 1x1 transparent PNG — swapped in for any image html-to-image can't embed (e.g. CORS-blocked hotlinks) so a failed fetch degrades gracefully instead of tainting the canvas and breaking the whole export. */
const IMAGE_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

/**
 * Renders `node` to a high-res PNG data URL — the caller decides whether to preview and/or
 * download it. No `backgroundColor` option: the card sets its own rarity-tinted background, and
 * passing one here would paint over it (learned this the hard way — it silently overrides
 * whatever background the node itself has, root-only, regardless of the node's own CSS).
 */
export async function renderShowcasePng(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 3,
    cacheBust: true,
    imagePlaceholder: IMAGE_FALLBACK,
  });
}

/** Filename format: "{username}-{type}-showcase-{date}.png". */
export function showcaseFilename(username: string, type: string): string {
  return `${username}-${type}-showcase-${new Date().toISOString().slice(0, 10)}.png`;
}

/** Triggers a browser download of a data URL under the given filename. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
