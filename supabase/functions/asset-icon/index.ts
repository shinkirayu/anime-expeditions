// Asset Icon proxy
//
// Roblox's thumbnails API (thumbnails.roblox.com) doesn't send CORS headers,
// so the dashboard can't call it directly from the browser. This function
// calls it server-side (no CORS involved server-to-server) and streams the
// resolved CDN image back through itself with an explicit
// Access-Control-Allow-Origin, so callers that need to read the bytes (not
// just display them) — e.g. html-to-image embedding icons into an export —
// can fetch() this endpoint successfully. A 302 redirect to the Roblox CDN
// would render fine in a plain <img> but fails fetch()'s CORS check, since
// neither the redirect nor Roblox's CDN sends CORS headers themselves.
//
// Public, read-only, no auth needed: GET ?id=<assetId>&size=150x150

const ALLOWED_SIZES = new Set([
  "42x42", "50x50", "60x62", "75x75", "110x110", "140x140",
  "150x150", "160x100", "160x600", "192x192", "256x256", "300x250", "352x352",
  "420x420", "480x270", "512x512", "700x700", "720x720", "728x90", "768x432",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const size = url.searchParams.get("size") ?? "150x150";

  if (!/^\d+$/.test(id)) {
    return new Response("missing or invalid id", { status: 400, headers: CORS_HEADERS });
  }
  const safeSize = ALLOWED_SIZES.has(size) ? size : "150x150";

  const api = `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=${safeSize}&format=Png&isCircular=false`;
  const res = await fetch(api);
  if (!res.ok) {
    return new Response("upstream error", { status: 502, headers: CORS_HEADERS });
  }

  const json = await res.json();
  const imageUrl = json?.data?.[0]?.imageUrl;
  if (!imageUrl) {
    return new Response("not found", { status: 404, headers: CORS_HEADERS });
  }

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok || !imageRes.body) {
    return new Response("image fetch failed", { status: 502, headers: CORS_HEADERS });
  }

  return new Response(imageRes.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": imageRes.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
