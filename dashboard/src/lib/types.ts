/** Row shapes mirror supabase/migrations/0001_init.sql. */

export interface CurrencyEntry {
  Amount: number;
  DisplayName?: string;
  Rarity?: string;
  Icon?: string;
}

export interface MatchInfo {
  MapName?: string;
  ActName?: string;
  Difficulty?: string;
  Gamemode?: string;
  CurrentGameState?: string;
  Wave?: number;
  MaxWave?: number;
  SessionTime?: number;
}

export interface StoryProgress {
  Locked?: boolean;
  RequiredLevel?: number;
  CompletedActs?: number;
  TotalActs?: number;
  Percent?: number;
  NextMap?: string;
  NextAct?: string;
  Completed?: boolean;
}

export interface ProgressInfo {
  InMatch?: boolean;
  Match?: MatchInfo | null;
  CompletedMapsCount?: number;
  CompletedMaps?: string[];
  Story?: StoryProgress | null;
  Raid?: StoryProgress | null;
}

/** Light list row — only the columns in ACCOUNT_LIST_COLUMNS are fetched. */
export interface AccountListRow {
  user_id: number;
  username: string;
  display_name: string | null;
  level: number | null;
  exp: number | null;
  currencies: Record<string, CurrencyEntry>;
  unit_count: number;
  item_count: number;
  in_match: boolean;
  progress: ProgressInfo;
  last_seen: string;
}

/** Full light row, fetched on the detail page. */
export interface AccountRow extends AccountListRow {
  stats: Record<string, unknown>;
  first_seen: string;
  updated_at: string;
}

export interface TraitInfo {
  Trait?: string;
  DisplayName?: string;
  Rarity?: string;
  Icon?: string;
  Description?: string;
}

export interface UnitEntry {
  UniqueId: string;
  Asset?: string;
  DisplayName?: string;
  Rarity?: string;
  Element?: string;
  Archetype?: string;
  Level?: number;
  EXP?: number;
  Equipped?: boolean | number;
  Worthiness?: number;
  TotalTakedowns?: number;
  ObtainedAt?: number;
  StatPotential?: Record<string, unknown>;
  Trait?: TraitInfo | null;
}

export interface InventoryEntry {
  Amount: number;
  DisplayName?: string;
  SubType?: string;
  Rarity?: string;
  Icon?: string;
}

/** Heavy 1:1 row — lazily fetched only on the detail page. */
export interface AccountDetailsRow {
  user_id: number;
  units: UnitEntry[];
  inventory: Record<string, InventoryEntry>;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  online: number;
  in_match: number;
  avg_level: number;
  max_level: number;
}

export type SortKey = "last_seen" | "level" | "username" | "exp";

export interface AccountFilters {
  search: string;
  sort: SortKey;
  onlineOnly: boolean;
  inMatchOnly: boolean;
}

/** Column list for the account grid — never SELECT * on the hot path. */
export const ACCOUNT_LIST_COLUMNS =
  "user_id,username,display_name,level,exp,currencies,unit_count,item_count,in_match,progress,last_seen";

export const PAGE_SIZE = 30;

/** An account is "online" if the tracker reported within this window. */
export const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}
