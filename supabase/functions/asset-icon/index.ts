// Asset Icon proxy
//
// Roblox's thumbnails API (thumbnails.roblox.com) doesn't send CORS headers,
// so the dashboard can't call it directly from the browser. This function
// calls it server-side (no CORS involved server-to-server) and 302-redirects
// to the resolved CDN image URL — <img> tags follow redirects fine without
// needing CORS themselves, unlike fetch/XHR.
//
// Public, read-only, no auth needed: GET ?id=<assetId>&size=150x150

const ALLOWED_SIZES = new Set([
  "42x42", "50x50", "60x62", "75x75", "110x110", "140x140",
  "150x150", "160x100", "160x600", "192x192", "256x256", "300x250", "352x352",
  "420x420", "480x270", "512x512", "700x700", "720x720", "728x90", "768x432",
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const size = url.searchParams.get("size") ?? "150x150";

  if (!/^\d+$/.test(id)) {
    return new Response("missing or invalid id", { status: 400 });
  }
  const safeSize = ALLOWED_SIZES.has(size) ? size : "150x150";

  const api = `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=${safeSize}&format=Png&isCircular=false`;
  const res = await fetch(api);
  if (!res.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const json = await res.json();
  const imageUrl = json?.data?.[0]?.imageUrl;
  if (!imageUrl) {
    return new Response("not found", { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: imageUrl, "Cache-Control": "public, max-age=86400" },
  });
});
