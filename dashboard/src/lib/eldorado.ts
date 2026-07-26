import { CognitoUser, CognitoUserPool, AuthenticationDetails } from "amazon-cognito-identity-js";
import { supabase } from "./supabase";
import type {
  AccountOfferCreateRequest,
  AuthMode,
  BulkAccount,
  EldoradoAuthState,
  EncodedPhoto,
  FlexibleOfferImage,
  GameOption,
  LibraryEntry,
  ListingTemplate,
  PublishResult,
} from "./eldoradoTypes";

/**
 * Full port of the Eldorado Auto Lister desktop app's business logic
 * (eldorado/src/main/**) into the browser. Eldorado's private seller API
 * authenticates via a cookie (not a bearer header) and requires the seller's
 * assigned User-Agent — a browser can't set either cross-origin, and
 * eldorado.gg sends no CORS headers anyway — so every call is routed through
 * the `eldorado-proxy` Supabase Edge Function, which attaches them
 * server-side.
 *
 * Session token, password, templates, and the bulk credential pool are kept
 * in this browser's localStorage only (per-device, matching the desktop
 * app's per-machine storage) — never sent to Supabase. Unlike the desktop
 * app, which encrypts secrets at rest with Electron's OS-backed safeStorage,
 * a browser has no equivalent primitive, so these are stored in plaintext
 * localStorage. Don't use this on a shared/public machine.
 */

// ---- Cognito constants (from Eldorado's public API docs / seller bot app) ----
const POOL_ID = "us-east-2_MlnzCFgHk";
const CLIENT_ID = "1956req5ro9drdtbf5i6kis4la";
const userPool = new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID });

export const MANUAL_DELIVERY_TIMES: { value: string; label: string }[] = [
  { value: "Minute20", label: "20 minutes" },
  { value: "Hour1", label: "1 hour" },
  { value: "Hour2", label: "2 hours" },
  { value: "Hour3", label: "3 hours" },
  { value: "Hour5", label: "5 hours" },
  { value: "Hour8", label: "8 hours" },
  { value: "Hour12", label: "12 hours" },
  { value: "Day1", label: "1 day" },
  { value: "Day2", label: "2 days" },
  { value: "Day3", label: "3 days" },
  { value: "Day7", label: "7 days" },
  { value: "Day14", label: "14 days" },
];

export const PRICE_LIMITS = {
  minUnitPrice: 0.00001,
  maxUnitPrice: 10000,
  minOfferValue: 0.5,
};

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Fixed notice appended to every account blob delivered to a buyer. */
export const PURCHASE_WARNING =
  "⚠️  Please record a video from the moment of purchase to assist in case of any disputes regarding account validity. Immediately log in copy pasting the user and the code, no unnecessary activities. Claim without video proof will not be accepted.";

const WARNING_MARKER = "Claim without video proof will not be accepted.";

export function formatAccountBlob(user: string, pass: string): string {
  return `User: ${user}\nPass: ${pass}\n\n${PURCHASE_WARNING}`;
}

export function ensureWarning(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.includes(WARNING_MARKER) ? trimmed : `${trimmed}\n\n${PURCHASE_WARNING}`;
}

// ---- localStorage-backed settings ----
const KEYS = {
  authMode: "eldorado.authMode",
  email: "eldorado.email",
  token: "eldorado.token",
  tokenExpiresAt: "eldorado.tokenExpiresAt",
  password: "eldorado.password",
  userAgent: "eldorado.userAgent",
  gameId: "eldorado.gameId",
  gameName: "eldorado.gameName",
  templates: "eldorado.templates",
  bulkAccounts: "eldorado.bulkAccounts",
} as const;

interface JwtClaims {
  exp?: number;
  email?: string;
  "cognito:username"?: string;
}

/** Decodes a JWT payload without verifying it (only to read exp/email). */
function parseJwt(token: string): JwtClaims | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return null;
  }
}

// In-tab cache of the last password-mode SRP sign-in (mirrors the desktop app's cache).
let passwordCache: { idToken: string; expiresAt: number; email: string } | null = null;

export function getAuthState(): EldoradoAuthState {
  const authMode = (localStorage.getItem(KEYS.authMode) as AuthMode | null) ?? "token";
  const email = localStorage.getItem(KEYS.email) ?? "";
  const now = Math.floor(Date.now() / 1000);
  if (authMode === "token") {
    const token = localStorage.getItem(KEYS.token) ?? "";
    const expiresAt = Number(localStorage.getItem(KEYS.tokenExpiresAt) ?? 0) || null;
    return { authMode, email, signedIn: token.length > 0 && !!expiresAt && expiresAt > now, tokenExpiresAt: expiresAt };
  }
  const password = localStorage.getItem(KEYS.password) ?? "";
  return { authMode, email, signedIn: email.length > 0 && password.length > 0, tokenExpiresAt: null };
}

export function getStoredUserAgent(): string {
  return localStorage.getItem(KEYS.userAgent) ?? "";
}

export function saveUserAgent(userAgent: string): void {
  localStorage.setItem(KEYS.userAgent, userAgent.trim());
}

export function setAuthMode(mode: AuthMode): EldoradoAuthState {
  passwordCache = null;
  localStorage.setItem(KEYS.authMode, mode);
  return getAuthState();
}

/** Validates and stores a pasted IdToken (token mode). */
export function saveToken(rawToken: string): EldoradoAuthState {
  const token = rawToken.trim().replace(/^Bearer\s+/i, "");
  const claims = parseJwt(token);
  if (!claims) throw new Error("That does not look like a valid token (expected a JWT).");
  if (!claims.exp) throw new Error("Token has no expiry claim; it may be the wrong value.");
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) throw new Error("That token has already expired. Copy a fresh one.");
  const email = claims.email || claims["cognito:username"] || "";
  localStorage.setItem(KEYS.authMode, "token");
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.tokenExpiresAt, String(claims.exp));
  localStorage.setItem(KEYS.email, email);
  return getAuthState();
}

function srpSignIn(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({ Username: email, Password: password });
    user.setAuthenticationFlowType("USER_SRP_AUTH");
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: (err) => reject(new Error(err?.message || "Authentication failed.")),
      newPasswordRequired: () => reject(new Error("This account requires a password change before it can be used.")),
    });
  });
}

/** Stores email + password and verifies them with one SRP sign-in (password mode). */
export async function savePassword(email: string, password: string): Promise<EldoradoAuthState> {
  if (!email.trim() || !password) throw new Error("Email and password are required.");
  const idToken = await srpSignIn(email.trim(), password); // throws on bad credentials
  const claims = parseJwt(idToken);
  passwordCache = { idToken, expiresAt: claims?.exp ?? 0, email: email.trim() };
  localStorage.setItem(KEYS.authMode, "password");
  localStorage.setItem(KEYS.email, email.trim());
  localStorage.setItem(KEYS.password, password);
  return getAuthState();
}

export function signOut(): EldoradoAuthState {
  passwordCache = null;
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.tokenExpiresAt);
  localStorage.removeItem(KEYS.password);
  return getAuthState();
}

/** Returns a valid IdToken for the active auth mode, or throws with guidance. */
async function getIdToken(): Promise<string> {
  const state = getAuthState();
  const now = Math.floor(Date.now() / 1000);

  if (state.authMode === "token") {
    const token = localStorage.getItem(KEYS.token) ?? "";
    const expiresAt = Number(localStorage.getItem(KEYS.tokenExpiresAt) ?? 0);
    if (!token || !expiresAt) throw new Error("No session token set. Add one in Eldorado Settings.");
    if (expiresAt - 30 <= now) throw new Error("Your session token has expired. Paste a fresh one in Settings.");
    return token;
  }

  // password mode
  if (passwordCache && passwordCache.email === state.email && passwordCache.expiresAt - 60 > now) {
    return passwordCache.idToken;
  }
  const password = localStorage.getItem(KEYS.password) ?? "";
  if (!state.email || !password) throw new Error("No credentials set. Add them in Eldorado Settings.");
  const idToken = await srpSignIn(state.email, password);
  passwordCache = { idToken, expiresAt: parseJwt(idToken)?.exp ?? 0, email: state.email };
  return idToken;
}

export function getCachedGame(): { gameId: string; name: string } | null {
  const gameId = localStorage.getItem(KEYS.gameId);
  const name = localStorage.getItem(KEYS.gameName);
  return gameId && name ? { gameId, name } : null;
}

export function setCachedGame(gameId: string, name: string): void {
  localStorage.setItem(KEYS.gameId, gameId);
  localStorage.setItem(KEYS.gameName, name);
}

// ---- Proxy client ----

interface FilePart {
  fieldName: string;
  filename: string;
  mimeType: string;
  base64: string;
}

interface ProxyOptions {
  method?: "GET" | "POST";
  json?: unknown;
  file?: FilePart;
  query?: Record<string, string>;
  /** Set false for endpoints that don't need the session cookie (default true). */
  auth?: boolean;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function eldoradoRequest<T>(path: string, options: ProxyOptions = {}): Promise<T> {
  const needsAuth = options.auth !== false;
  const token = needsAuth ? await getIdToken() : "";
  const userAgent = getStoredUserAgent();
  if (needsAuth && !userAgent) {
    throw new Error("Eldorado User-Agent is not set. Add it in Eldorado Settings.");
  }

  const { data, error } = await supabase.functions.invoke("eldorado-proxy", {
    body: {
      path,
      method: options.method ?? "GET",
      json: options.json,
      file: options.file,
      query: options.query,
      token,
      userAgent,
    },
  });

  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.clone === "function") {
      try {
        const body = await context.clone().json();
        message = body?.error || (Array.isArray(body?.messages) ? body.messages.filter(Boolean).join(" ") : message);
      } catch {
        /* fall back to error.message */
      }
    }
    throw new Error(message || "Eldorado request failed.");
  }

  return data as T;
}

// ---- Games catalog ----

export async function fetchAccountGames(): Promise<GameOption[]> {
  const library = await eldoradoRequest<LibraryEntry[]>("library", { query: { locale: "en-US" }, auth: false });
  const byId = new Map<string, GameOption>();
  for (const row of library) {
    if (row.category !== "Account") continue;
    if (byId.has(row.gameId)) continue;
    byId.set(row.gameId, {
      gameId: row.gameId,
      name: row.gameName || row.menuGameTitle,
      seoAlias: row.seoAlias,
      isPopular: row.isPopularGame,
    });
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ---- Photo upload ----

const OFFER_IMAGE_BASE_PATH = "/offerimages/";
const OFFER_FILE_TYPE = "Offer";

function toOfferImage(localPaths: string[] | undefined): FlexibleOfferImage | null {
  if (!localPaths || localPaths.length === 0) return null;
  const [small, large, original] = localPaths.map((p) => p.replace(OFFER_IMAGE_BASE_PATH, ""));
  return {
    smallImage: small ?? null,
    largeImage: large ?? small ?? null,
    originalSizeImage: original ?? large ?? small ?? null,
  };
}

async function uploadPhoto(photo: EncodedPhoto): Promise<FlexibleOfferImage | null> {
  const res = await eldoradoRequest<{ localPaths: string[] }>(`files/me/${OFFER_FILE_TYPE}`, {
    method: "POST",
    file: {
      fieldName: "image",
      filename: photo.name,
      mimeType: photo.mimeType || "application/octet-stream",
      base64: bytesToBase64(photo.bytes),
    },
  });
  return toOfferImage(res?.localPaths);
}

/** Uploads photos sequentially (the API takes one file per request). */
export async function uploadPhotos(photos: EncodedPhoto[]): Promise<FlexibleOfferImage[]> {
  const images: FlexibleOfferImage[] = [];
  for (const photo of photos) {
    const image = await uploadPhoto(photo);
    if (image) images.push(image);
  }
  return images;
}

// ---- Listings ----

export interface PublishInput {
  gameId: string;
  offerTitle: string;
  description: string;
  price: number;
  hasOriginalEmail: boolean;
  photos: EncodedPhoto[];
  deliveryMethod: "Automatic" | "Manual";
  /** Automatic: one free-text blob per account (buyer receives one per purchase). */
  accounts: string[];
  /** Manual: the guaranteed delivery time the seller commits to. */
  manualDeliveryTime: string;
  /** Manual: how many identical accounts are in stock. */
  quantity: number;
}

function buildRequest(input: PublishInput, images: FlexibleOfferImage[]): AccountOfferCreateRequest {
  const isAuto = input.deliveryMethod === "Automatic";
  const accounts = input.accounts.map((a) => a.trim()).filter((a) => a.length > 0);

  return {
    details: {
      offerTitle: input.offerTitle,
      mainOfferImage: images[0] ?? null,
      offerImages: images.slice(1),
      description: input.description,
      guaranteedDeliveryTime: isAuto ? "Instant" : (input.manualDeliveryTime as AccountOfferCreateRequest["details"]["guaranteedDeliveryTime"]),
      pricing: {
        quantity: isAuto ? Math.max(accounts.length, 1) : Math.max(input.quantity, 1),
        minQuantity: 1,
        volumeDiscounts: [],
        pricePerUnit: { amount: input.price, currency: "USD" },
      },
      hasOriginalEmail: input.hasOriginalEmail,
    },
    augmentedGame: {
      gameId: input.gameId,
      category: "Account",
      tradeEnvironmentId: null,
      attributeIdsCsv: null,
      offerAttributes: [],
    },
    accountSecretDetails: isAuto ? accounts : [],
  };
}

/** Full publish flow: upload photos -> build the request -> create the account offer. */
export async function publishListing(input: PublishInput): Promise<PublishResult> {
  const images = await uploadPhotos(input.photos);
  const request = buildRequest(input, images);
  const created = await eldoradoRequest<{ id?: string; offerId?: string }>("flexibleOffers/account", {
    method: "POST",
    json: request,
  });
  return { offerId: created?.id ?? created?.offerId ?? "(created)", uploadedImages: images.length };
}

export async function testConnection(): Promise<string> {
  await eldoradoRequest<unknown>("v1/orders/me/seller-api-eligibility");
  return "Connected. Authentication and seller API access are working.";
}

// ---- Templates ----

function readTemplates(): ListingTemplate[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.templates) ?? "[]");
    return Array.isArray(data) ? (data as ListingTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeTemplates(list: ListingTemplate[]): void {
  localStorage.setItem(KEYS.templates, JSON.stringify(list));
}

export function getTemplates(): ListingTemplate[] {
  return readTemplates().sort((a, b) => a.name.localeCompare(b.name));
}

export function saveTemplate(template: ListingTemplate): ListingTemplate[] {
  const name = template.name.trim();
  if (!name) throw new Error("Template name is required.");
  const list = readTemplates().filter((t) => t.name.toLowerCase() !== name.toLowerCase());
  list.push({ ...template, name });
  writeTemplates(list);
  return getTemplates();
}

export function deleteTemplate(name: string): ListingTemplate[] {
  writeTemplates(readTemplates().filter((t) => t.name.toLowerCase() !== name.toLowerCase()));
  return getTemplates();
}

// ---- Bulk accounts (credential pool) ----

function readBulkAccounts(): BulkAccount[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.bulkAccounts) ?? "[]");
    return Array.isArray(data) ? (data as BulkAccount[]) : [];
  } catch {
    return [];
  }
}

function writeBulkAccounts(list: BulkAccount[]): void {
  localStorage.setItem(KEYS.bulkAccounts, JSON.stringify(list));
}

export function getBulkAccounts(): BulkAccount[] {
  return readBulkAccounts();
}

/** Finds a Bulk Accounts pool entry whose username matches (case-insensitive). */
export function findBulkAccountByUsername(username: string): BulkAccount | undefined {
  const needle = username.trim().toLowerCase();
  if (!needle) return undefined;
  return readBulkAccounts().find((a) => a.user.trim().toLowerCase() === needle);
}

/**
 * Builds an Automatic-delivery account blob for a known Roblox username — the
 * real credentials if a Bulk Accounts pool entry matches that username,
 * otherwise a fill-in-the-blank placeholder for the seller to complete by hand.
 */
export function buildAccountBlobForUsername(username: string): string {
  const match = findBulkAccountByUsername(username);
  return match
    ? ensureWarning(`User: ${match.user}\nPass: ${match.pass}`)
    : ensureWarning(`Roblox username: ${username}\nUser: \nPass: `);
}

export interface ImportResult {
  accounts: BulkAccount[];
  added: number;
  skipped: number;
}

/**
 * Parses pasted text of `user:pass` lines (one per line) and appends any new
 * pairs. Splits on the FIRST colon so passwords may contain colons. Blank
 * lines, `#` comments, and duplicates (same user) are skipped.
 */
export function importBulkAccounts(text: string): ImportResult {
  const existing = readBulkAccounts();
  const seen = new Set(existing.map((a) => a.user.toLowerCase()));
  let added = 0;
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf(":");
    if (idx <= 0 || idx === line.length - 1) {
      skipped++;
      continue;
    }
    const user = line.slice(0, idx).trim();
    const pass = line.slice(idx + 1).trim();
    if (!user || !pass || seen.has(user.toLowerCase())) {
      skipped++;
      continue;
    }

    seen.add(user.toLowerCase());
    existing.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, user, pass, used: false });
    added++;
  }

  writeBulkAccounts(existing);
  return { accounts: existing, added, skipped };
}

export function setBulkAccountsUsed(ids: string[], used: boolean): BulkAccount[] {
  const set = new Set(ids);
  const list = readBulkAccounts().map((a) => (set.has(a.id) ? { ...a, used } : a));
  writeBulkAccounts(list);
  return list;
}

export function removeBulkAccounts(ids: string[]): BulkAccount[] {
  const set = new Set(ids);
  const list = readBulkAccounts().filter((a) => !set.has(a.id));
  writeBulkAccounts(list);
  return list;
}

export function clearBulkAccounts(): BulkAccount[] {
  writeBulkAccounts([]);
  return [];
}
