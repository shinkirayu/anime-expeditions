// Eldorado Proxy Edge Function
//
// The dashboard ports the full Eldorado Auto Lister feature set (auth,
// listing publish incl. photos, game catalog) into the browser. Eldorado's
// private seller API only accepts requests carrying a
// `__Host-EldoradoIdToken` cookie plus the seller's assigned User-Agent —
// headers a browser can't set on a cross-origin fetch, and eldorado.gg
// doesn't send CORS headers for these endpoints anyway. This function makes
// the request server-to-server (no CORS involved on that leg) and passes the
// result straight through.
//
// The caller's Eldorado session token + User-Agent are supplied per request
// (kept in the browser's localStorage — see dashboard/src/lib/eldorado.ts)
// and are never stored here.
//
// Deployed with default JWT verification: only signed-in dashboard users
// (Supabase Auth) can invoke it.
//   supabase functions deploy eldorado-proxy
//
// BASE_URL is intentionally NOT client-configurable (unlike the desktop
// app's Settings page) — accepting an arbitrary host from the request body
// would turn this into an open SSRF proxy.

const BASE_URL = "https://www.eldorado.gg";

// Exact-path allowlist — keeps this from becoming an open proxy to all of
// eldorado.gg even though it's already gated behind Supabase auth.
const ALLOWED_PATHS = new Set([
  "library", // public game catalog
  "flexibleOffers/account", // create an account offer
  "v1/orders/me/seller-api-eligibility", // "test connection"
  "files/me/Offer", // offer photo upload
]);

// Only "library" is a public catalog endpoint; everything else needs the auth cookie.
const PUBLIC_PATHS = new Set(["library"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FilePart {
  /** multipart form field name, e.g. "image". */
  fieldName: string;
  filename: string;
  mimeType: string;
  /** Base64-encoded file bytes. */
  base64: string;
}

interface ProxyRequest {
  path: string;
  method?: "GET" | "POST";
  json?: unknown;
  file?: FilePart;
  token?: string;
  userAgent?: string;
  query?: Record<string, string>;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }

  const path = (body.path ?? "").replace(/^\/+/, "");
  if (!ALLOWED_PATHS.has(path)) {
    return jsonResponse({ error: "path not allowed" }, 400);
  }

  const needsAuth = !PUBLIC_PATHS.has(path);
  if (needsAuth && !body.token) {
    return jsonResponse({ error: "missing eldorado session token" }, 400);
  }

  const url = new URL(`${BASE_URL}/api/${path}`);
  if (body.query) {
    for (const [k, v] of Object.entries(body.query)) {
      if (v != null) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body.userAgent) headers["User-Agent"] = body.userAgent;
  if (needsAuth) headers["Cookie"] = `__Host-EldoradoIdToken=${body.token}`;

  let upstreamBody: BodyInit | undefined;
  if (body.file) {
    const form = new FormData();
    const blob = new Blob([base64ToBytes(body.file.base64)], { type: body.file.mimeType || "application/octet-stream" });
    form.append(body.file.fieldName, blob, body.file.filename);
    upstreamBody = form; // fetch sets the multipart boundary automatically
  } else if (body.json !== undefined) {
    headers["Content-Type"] = "application/json";
    upstreamBody = JSON.stringify(body.json);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: body.method ?? "GET",
      headers,
      body: upstreamBody,
    });
  } catch (err) {
    return jsonResponse(
      { error: `upstream request failed: ${err instanceof Error ? err.message : String(err)}` },
      502,
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
});
