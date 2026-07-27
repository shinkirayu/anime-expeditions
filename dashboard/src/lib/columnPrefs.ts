/**
 * Which optional dashboard columns/buttons are visible — saved in this
 * browser's localStorage so the choice survives reloads. "Optional" means
 * everything except the Account/Level/Last-update columns, which are always
 * shown.
 */

export type ColumnKey =
  | "gems"
  | "traitCrystal"
  | "crowRelic"
  | "villainCoins"
  | "secretPity"
  | "story"
  | "raid"
  | "villain"
  | "unitsButton"
  | "itemsButton"
  | "location";

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  gems: "Gems",
  traitCrystal: "Trait Crystal",
  crowRelic: "Crow Relic",
  villainCoins: "Villain Coins",
  secretPity: "Secret Pity",
  story: "Story",
  raid: "Raid",
  villain: "Villain",
  unitsButton: "Units button",
  itemsButton: "Items button",
  location: "Location",
};

export const ALL_COLUMNS = Object.keys(COLUMN_LABELS) as ColumnKey[];

export type ColumnPrefs = Record<ColumnKey, boolean>;

const STORAGE_KEY = "ae-dashboard-columns";

function defaults(): ColumnPrefs {
  return Object.fromEntries(ALL_COLUMNS.map((k) => [k, true])) as ColumnPrefs;
}

export function loadColumnPrefs(): ColumnPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const saved = JSON.parse(raw);
    return { ...defaults(), ...saved };
  } catch {
    return defaults();
  }
}

export function saveColumnPrefs(prefs: ColumnPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode */
  }
}
