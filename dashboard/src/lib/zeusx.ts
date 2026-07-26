import { supabase } from "./supabase";
import type { ZeusXAttribute, ZeusXListingInput, ZeusXPublishResult } from "./zeusxTypes";

/**
 * Client for ZeusX.com listing creation, routed through the `zeusx-proxy`
 * Edge Function (browsers can't set the Bearer/currency headers ZeusX's
 * private API requires on a cross-origin request, and it sends no CORS
 * headers for our origin anyway). The Bearer token is kept in this
 * browser's localStorage only — never sent anywhere but the proxy.
 *
 * Unlike Eldorado, ZeusX has no accessible headless-login flow (its own
 * desktop tool attaches to a real logged-in Chrome specifically to dodge
 * reCAPTCHA/Cloudflare) — so the only supported auth mode here is pasting a
 * captured Bearer token, mirroring Eldorado's "token mode".
 */

const KEYS = {
  token: "zeusx.token",
  currency: "zeusx.currency",
} as const;

export interface ZeusXAuthStatus {
  configured: boolean;
}

export function getZeusXAuthStatus(): ZeusXAuthStatus {
  return { configured: (localStorage.getItem(KEYS.token) ?? "").length > 0 };
}

export function getZeusXCurrency(): string {
  return localStorage.getItem(KEYS.currency) || "USD";
}

export function saveZeusXCreds(rawToken: string, currency: string): void {
  const token = rawToken.trim().replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Paste a Bearer token first.");
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.currency, currency.trim() || "USD");
}

export function clearZeusXCreds(): void {
  localStorage.removeItem(KEYS.token);
}

interface ProxyOptions {
  method?: "GET" | "POST" | "PUT";
  json?: unknown;
  offerId?: string;
  s3Url?: string;
  file?: { base64: string; mimeType: string };
  query?: Record<string, string>;
}

async function zeusxRequest<T>(path: string, options: ProxyOptions = {}): Promise<T> {
  const token = localStorage.getItem(KEYS.token) ?? "";
  if (path !== "s3-upload" && !token) {
    throw new Error("ZeusX is not connected. Add your Bearer token first.");
  }

  const { data, error } = await supabase.functions.invoke("zeusx-proxy", {
    body: {
      path,
      method: options.method,
      json: options.json,
      offerId: options.offerId,
      s3Url: options.s3Url,
      file: options.file,
      query: options.query,
      token,
      currency: getZeusXCurrency(),
    },
  });

  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.clone === "function") {
      try {
        const errBody = await context.clone().json();
        message = errBody?.error || message;
      } catch {
        /* fall back to error.message */
      }
    }
    throw new Error(message || "ZeusX request failed.");
  }

  return data as T;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Recursively collects every string value in a JSON-ish structure (mirrors the Python tool's allStrings()). */
function allStrings(v: unknown, acc: string[]): string[] {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => allStrings(x, acc));
  return acc;
}

interface UploadedPhoto {
  photo_id: string;
  photo_url: string;
  file_name: string;
}

async function uploadPhoto(photo: NonNullable<ZeusXListingInput["photo"]>): Promise<UploadedPhoto> {
  const upJson = await zeusxRequest<unknown>("v1/upload/request-upload-urls", {
    json: { files: [{ file_name: photo.name }], type: "OFFER_PHOTO" },
  });
  const s3url = allStrings(upJson, []).find((s) => s.includes("amazonaws") || s.includes("X-Amz-"));
  if (!s3url) throw new Error("ZeusX didn't return an upload URL.");
  const m = s3url.match(/\/([^/?]+\.[a-z0-9]+)\?/i);
  const photoUrl = m ? m[1] : null;
  const photoId = photoUrl ? photoUrl.replace(/\.[^.]+$/, "") : null;
  if (!photoId || !photoUrl) throw new Error("Couldn't derive a photo id from ZeusX's upload URL.");

  const put = await zeusxRequest<{ ok: boolean; status: number }>("s3-upload", {
    s3Url: s3url,
    file: { base64: bytesToBase64(photo.bytes), mimeType: photo.mimeType || "application/octet-stream" },
  });
  if (!put.ok) throw new Error(`Photo upload to S3 failed (status ${put.status}).`);

  return { photo_id: photoId, photo_url: photoUrl, file_name: photo.name };
}

function attrsToPayload(attrs: ZeusXAttribute[]) {
  return attrs.map((a) => ({ base_attribute_id: a.baseAttributeId, base_attribute_value: a.baseAttributeValue }));
}

/** Mirrors the Python tool's build_offer(). */
function buildOffer(input: ZeusXListingInput, uploaded: UploadedPhoto[]) {
  const offer: Record<string, unknown> = {
    service_category_id: input.categoryId,
    tags: [],
    delivery_method: input.deliveryMethod || "COORDINATED",
    is_account_linked: false,
    uploaded_photos: uploaded,
    service_category_base_id: input.categoryBaseId,
    offer_base_attribute_value: attrsToPayload(input.attributes),
    title: input.title,
    listed_price: input.price,
    description: input.description || "<p></p>",
    agreeTerm: true,
    quantity: null,
    removing_photo_ids: [],
    photos: [],
  };

  const qty = Number.parseInt(input.quantity.trim(), 10);
  if (input.quantity.trim() && Number.isFinite(qty) && qty > 1) {
    offer.has_multiple_stock = true;
    offer.quantity = qty;
  }

  const days = input.days.trim();
  const hours = input.hours.trim();
  if (days || hours) {
    offer.days = Number.parseInt(days || "0", 10);
    offer.hours = Number.parseInt(hours || "0", 10);
  }

  return offer;
}

function pickOfferId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const data = o.data as Record<string, unknown> | undefined;
  if (data?.id !== undefined) return String(data.id);
  if (data?.offer_id !== undefined) return String(data.offer_id);
  const offer = o.offer as Record<string, unknown> | undefined;
  if (offer?.id !== undefined) return String(offer.id);
  if (o.id !== undefined) return String(o.id);
  if (o.offer_id !== undefined) return String(o.offer_id);
  return null;
}

export async function publishZeusXListing(input: ZeusXListingInput): Promise<ZeusXPublishResult> {
  const uploaded = input.photo ? [await uploadPhoto(input.photo)] : [];
  const offer = buildOffer(input, uploaded);
  const body = await zeusxRequest<unknown>("v1/offer/create-offer", { json: { offer } });
  return { offerId: pickOfferId(body) };
}

export async function cancelZeusXOffer(offerId: string): Promise<void> {
  await zeusxRequest("v1/offer/{id}/cancel", { offerId });
}
