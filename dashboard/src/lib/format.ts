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

/** Gems is the game's one real currency; pull it out of the currencies bag by name. */
export function getGemsAmount(currencies: Record<string, { Amount: number }> | null | undefined): number {
  if (!currencies) return 0;
  for (const [name, entry] of Object.entries(currencies)) {
    if (name.toLowerCase().includes("gem")) return entry.Amount ?? 0;
  }
  return 0;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** "Act 1" -> "I", "Act 2" -> "II", etc. Falls back to the raw name if not "Act N". */
function actToRoman(actName: string | undefined): string | undefined {
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
