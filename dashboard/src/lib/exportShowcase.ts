import { toPng } from "html-to-image";

/** 1x1 transparent PNG — swapped in for any image html-to-image can't embed (e.g. CORS-blocked hotlinks) so a failed fetch degrades gracefully instead of tainting the canvas and breaking the whole export. */
const IMAGE_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Renders `node` to a high-res PNG and triggers a browser download named "{username}-showcase-{date}.png". */
export async function exportShowcaseImage(node: HTMLElement, username: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    cacheBust: true,
    imagePlaceholder: IMAGE_FALLBACK,
    backgroundColor: "#0d0a14",
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${username}-showcase-${todayIso()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
