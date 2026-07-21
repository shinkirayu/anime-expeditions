// Ingest Edge Function
//
// Receives tracker payloads (SchemaVersion 2) and forwards them to the
// ingest_snapshot() Postgres function — exactly ONE database round trip per
// report, and zero writes when the payload hash is unchanged.
//
// Deploy with JWT verification off (the Roblox client can't mint Supabase JWTs;
// auth is the ?key= per-user tracker token instead, resolved by
// ingest_snapshot() against public.tracker_tokens):
//   supabase functions deploy ingest --no-verify-jwt
//
// Each dashboard user gets their own token from get_or_create_my_tracker_token();
// their personal tracker endpoint is:
//   https://<project-ref>.supabase.co/functions/v1/ingest?key=<their-token>

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Tiny in-instance dedupe: if the same worker instance sees the same hash for
// the same (token, account) pair, skip the DB call entirely. (Best-effort —
// instances are ephemeral; ingest_snapshot() is the authoritative dedupe.)
const lastHash = new Map<string, string>();

async function sha1(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const token = new URL(req.url).searchParams.get("key") ?? "";
  if (!token) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const userId = (payload?.Account as Record<string, unknown> | undefined)?.UserId;
  if (payload?.Ready !== true || typeof userId !== "number") {
    return new Response(JSON.stringify({ changed: false, reason: "not ready" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { CapturedAt: _dropped, ...stable } = payload;
  const hash = await sha1(JSON.stringify(stable));
  const dedupeKey = `${token}:${userId}`;
  if (lastHash.get(dedupeKey) === hash) {
    return new Response(JSON.stringify({ changed: false, deduped: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const { data, error } = await supabase.rpc("ingest_snapshot", { p: payload, p_token: token });
  if (error) {
    console.error("ingest_snapshot failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if ((data as { reason?: string } | null)?.reason === "invalid token") {
    return new Response(JSON.stringify(data), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  lastHash.set(dedupeKey, hash);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
