import type { CSSProperties } from "react";

/** Best-to-worst rarity order — used for "sort by rarity" and "best unit first" everywhere. */
export const RARITY_ORDER = ["Secret", "Mythic", "Legendary", "Epic", "Rare"];

/** Index into RARITY_ORDER, unknown/absent rarities sort last. */
export function rarityRank(rarity: string | undefined): number {
  const i = rarity ? RARITY_ORDER.indexOf(rarity) : -1;
  return i === -1 ? RARITY_ORDER.length : i;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.abs(n) >= 10_000 ? compact.format(n) : full.format(n);
}

export function fmtFullNum(n: number | null | undefined): string {
  return n == null ? "—" : full.format(n);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export function fmtPlaytime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const RARITY_COLORS: Record<string, string> = {
  Common: "text-zinc-500 dark:text-zinc-400",
  Uncommon: "text-green-600 dark:text-green-400",
  Rare: "text-blue-600 dark:text-blue-400",
  Epic: "text-purple-600 dark:text-purple-400",
  Legendary: "text-amber-600 dark:text-amber-400",
  Mythic: "text-rose-600 dark:text-rose-400",
  Secret: "text-fuchsia-600 dark:text-fuchsia-400",
};

export function rarityClass(rarity: string | undefined): string {
  return (rarity && RARITY_COLORS[rarity]) || "text-zinc-600 dark:text-zinc-300";
}

/** Rarity gradient color stops, copied 1:1 from the wiki's unit-box card styling (site.html). */
export const RARITY_GRADIENT: Record<string, string> = {
  Rare: "rgb(0, 149, 255), rgb(25, 60, 235), rgb(0, 149, 255)",
  Epic: "rgb(153, 10, 255), rgb(76, 39, 154)",
  Legendary: "rgb(255, 203, 14) 10%, rgb(218, 118, 4), rgb(255, 203, 14) 80%",
  Mythic: "rgb(255, 7, 7), rgb(247, 221, 27), rgb(93, 229, 30), rgb(43, 174, 194), rgb(97, 61, 206), rgb(255, 84, 238)",
  Exclusive: "rgb(183, 249, 255), rgb(225, 178, 255), rgb(183, 249, 255)",
  Secret: "rgb(255, 0, 0), rgb(90, 19, 19), rgb(255, 0, 0)",
};

const WIKI_UNIT_BOX_TEXTURE = "https://static.wikitide.net/animeexpeditionswiki/0/00/EntityBox_Dark.png";

/**
 * Layered background (vignette + wiki texture overlay + rarity gradient) that reproduces the
 * wiki's rarity box, style-for-style, off site.html's `.style-338` rule — the same template the
 * wiki uses for both units (site.html) and items (items.html), confirmed identical byte-for-byte.
 */
export function rarityBoxStyle(rarity: string | undefined): CSSProperties {
  const stops = (rarity && RARITY_GRADIENT[rarity]) || "rgb(140, 140, 150), rgb(70, 70, 80), rgb(140, 140, 150)";
  return {
    backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, 0.25) 100%), url('${WIKI_UNIT_BOX_TEXTURE}'), linear-gradient(135deg, ${stops})`,
    backgroundSize: "cover, 91%, 99% 99%",
    backgroundPosition: "50% 50%",
    backgroundRepeat: "no-repeat",
  };
}

interface CurrencyLike {
  Amount: number;
  DisplayName?: string;
  Icon?: string;
}

/** Look up a currency entry by key or DisplayName (case-insensitive substring match). */
export function getCurrencyEntry(
  currencies: Record<string, CurrencyLike> | null | undefined,
  term: string,
): CurrencyLike | undefined {
  if (!currencies) return undefined;
  const needle = term.toLowerCase();
  for (const [name, entry] of Object.entries(currencies)) {
    if (name.toLowerCase().includes(needle) || (entry.DisplayName ?? "").toLowerCase().includes(needle)) {
      return entry;
    }
  }
  return undefined;
}

/** Gems is the game's main currency; pull it out of the currencies bag by name. */
export function getGemsAmount(currencies: Record<string, CurrencyLike> | null | undefined): number {
  return getCurrencyEntry(currencies, "gem")?.Amount ?? 0;
}

/** Scan the raw `stats` bag for the first numeric field whose key contains any of `needles` (case-insensitive). */
export function findStatValue(stats: Record<string, unknown> | null | undefined, needles: string[]): number | undefined {
  if (!stats) return undefined;
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value !== "number") continue;
    const lower = key.toLowerCase();
    if (needles.some((n) => lower.includes(n))) return value;
  }
  return undefined;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** "Act 1" -> "I", "Act 2" -> "II", etc. Falls back to the raw name if not "Act N". */
export function actToRoman(actName: string | undefined): string | undefined {
  if (!actName) return undefined;
  const n = Number(actName.match(/\d+/)?.[0]);
  if (!n || n < 1 || n > ROMAN_NUMERALS.length) return actName;
  return ROMAN_NUMERALS[n - 1];
}

interface ProgressLike {
  InMatch?: boolean;
  Match?: { MapName?: string; ActName?: string; Wave?: number; MaxWave?: number } | null;
}

/**
 * "Offline" when the tracker hasn't reported recently — "Lobby" would be
 * misleading since that's just the last known state, not a live one.
 * Otherwise "Lobby" when not in a match, or the actual stage, e.g.
 * "SchoolGrounds I". The game's "Act N" within a map is the stage variant
 * players call "Map I/II/III".
 */
export function getLocationLabel(progress: ProgressLike | null | undefined, online: boolean): string {
  if (!online) return "Offline";
  if (!progress?.InMatch) return "Lobby";
  const m = progress.Match;
  if (!m) return "In Match";
  const roman = actToRoman(m.ActName);
  const place = m.MapName ? (roman ? `${m.MapName} ${roman}` : m.MapName) : m.ActName || "In Match";
  if (m.Wave != null && m.MaxWave != null) {
    return `${place} · Wave ${m.Wave}/${m.MaxWave}`;
  }
  return place;
}
