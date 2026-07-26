// ZeusX Proxy Edge Function
//
// Lets the dashboard publish ZeusX.com listings. ZeusX's private API
// (api.zeusx.com) only accepts requests carrying a Bearer token + a
// `zeusx-currency` header, and doesn't send CORS headers for a browser on
// our dashboard's origin — so calls are relayed server-to-server here,
// mirroring eldorado-proxy. The photo-upload flow additionally needs a raw
// PUT of image bytes to a presigned S3 URL that ZeusX hands back per
// request (see "s3-upload" below).
//
// The caller's ZeusX Bearer token is supplied per request (kept in the
// browser's localStorage — see dashboard/src/lib/zeusx.ts) and never
// stored here.
//
// Deployed with default JWT verification: only signed-in dashboard users
// (Supabase Auth) can invoke it.
//   supabase functions deploy zeusx-proxy

const BASE_URL = "https://api.zeusx.com";

// Exact-path allowlist (after {id} substitution) — keeps this from becoming
// an open proxy to all of api.zeusx.com even though it's already gated
// behind Supabase auth. "s3-upload" is a distinct, specially-handled path
// for the raw S3 PUT (see below).
const ALLOWED_PATHS = new Set(["v1/upload/request-upload-urls", "v1/offer/create-offer", "v1/offer/{id}/cancel"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProxyRequest {
  path: string;
  method?: "GET" | "POST" | "PUT";
  json?: unknown;
  token?: string;
  currency?: string;
  /** Substituted into "v1/offer/{id}/cancel". */
  offerId?: string;
  /** "s3-upload" only: presigned S3 URL to PUT raw bytes to. */
  s3Url?: string;
  file?: { base64: string; mimeType: string };
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

  // Raw S3 PUT for the uploaded photo bytes. The URL is generated per-request by
  // ZeusX's own upload API, so it can't be on a static allowlist — instead its
  // host is checked to be an S3 endpoint, so this can't become an open relay.
  if (body.path === "s3-upload") {
    if (!body.s3Url || !body.file) {
      return jsonResponse({ error: "missing s3Url or file" }, 400);
    }
    let url: URL;
    try {
      url = new URL(body.s3Url);
    } catch {
      return jsonResponse({ error: "invalid s3Url" }, 400);
    }
    if (!url.hostname.endsWith("amazonaws.com")) {
      return jsonResponse({ error: "s3Url must point at amazonaws.com" }, 400);
    }
    try {
      const upstream = await fetch(url, {
        method: "PUT",
        headers: { "content-type": body.file.mimeType || "application/octet-stream" },
        body: base64ToBytes(body.file.base64),
      });
      return jsonResponse({ ok: upstream.ok, status: upstream.status }, 200);
    } catch (err) {
      return jsonResponse({ error: `s3 upload failed: ${err instanceof Error ? err.message : String(err)}` }, 502);
    }
  }

  if (!ALLOWED_PATHS.has(body.path)) {
    return jsonResponse({ error: "path not allowed" }, 400);
  }
  if (!body.token) {
    return jsonResponse({ error: "missing zeusx bearer token" }, 400);
  }

  const resolvedPath = body.path === "v1/offer/{id}/cancel" ? `v1/offer/${encodeURIComponent(body.offerId ?? "")}/cancel` : body.path;
  if (body.path === "v1/offer/{id}/cancel" && !body.offerId) {
    return jsonResponse({ error: "missing offerId" }, 400);
  }

  const url = new URL(`${BASE_URL}/${resolvedPath}`);
  if (body.query) {
    for (const [k, v] of Object.entries(body.query)) {
      if (v != null) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${body.token}`,
    "zeusx-currency": body.currency || "USD",
  };

  let upstreamBody: string | undefined;
  if (body.json !== undefined) {
    headers["Content-Type"] = "application/json";
    upstreamBody = JSON.stringify(body.json);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: body.method ?? (body.path === "v1/offer/{id}/cancel" ? "PUT" : "POST"),
      headers,
      body: upstreamBody,
    });
  } catch (err) {
    return jsonResponse({ error: `upstream request failed: ${err instanceof Error ? err.message : String(err)}` }, 502);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
});
