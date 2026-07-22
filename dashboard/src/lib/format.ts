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

/** Card-background gradient + border per rarity, for the blocky item tiles. */
export const RARITY_CARD_BG: Record<string, string> = {
  Common: "from-zinc-400 to-zinc-600 border-zinc-400/50",
  Uncommon: "from-green-400 to-green-700 border-green-400/50",
  Rare: "from-blue-400 to-blue-700 border-blue-400/50",
  Epic: "from-purple-400 to-purple-800 border-purple-400/50",
  Legendary: "from-amber-400 to-orange-700 border-amber-400/50",
  Mythic: "from-rose-400 to-fuchsia-800 border-rose-400/50",
  Secret: "from-fuchsia-400 to-purple-900 border-fuchsia-400/50",
};

export function rarityCardBg(rarity: string | undefined): string {
  return (rarity && RARITY_CARD_BG[rarity]) || "from-zinc-500 to-zinc-700 border-zinc-400/40";
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
 * "Lobby" when not in a match; otherwise the actual stage, e.g. "SchoolGrounds I".
 * The game's "Act N" within a map is the stage variant players call "Map I/II/III".
 */
export function getLocationLabel(progress: ProgressLike | null | undefined): string {
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
