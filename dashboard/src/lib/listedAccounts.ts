/**
 * Tracks which tracked accounts have already been published as a marketplace
 * listing (Eldorado and/or ZeusX), so the Units tab can flag "already listed"
 * accounts instead of accidentally double-listing them. Stored in this
 * browser's localStorage only, alongside the rest of the marketplace state —
 * it's a local reminder, not a source of truth synced across devices.
 */

export type Marketplace = "eldorado" | "zeusx";

interface ListedRecord {
  /** ISO timestamp of the last successful publish, per marketplace. */
  eldorado?: string;
  zeusx?: string;
}

const STORAGE_KEY = "listedAccounts";

function readAll(): Record<string, ListedRecord> {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ListedRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getListedRecord(userId: number): ListedRecord | null {
  return readAll()[String(userId)] ?? null;
}

export function isAccountListed(userId: number): boolean {
  const rec = getListedRecord(userId);
  return !!rec && (!!rec.eldorado || !!rec.zeusx);
}

export function markAccountsListed(userIds: number[], marketplace: Marketplace): void {
  if (userIds.length === 0) return;
  const all = readAll();
  const now = new Date().toISOString();
  for (const userId of userIds) {
    const key = String(userId);
    all[key] = { ...all[key], [marketplace]: now };
  }
  writeAll(all);
}

export function unmarkAccountListed(userId: number, marketplace?: Marketplace): void {
  const all = readAll();
  const key = String(userId);
  if (!all[key]) return;
  if (!marketplace) {
    delete all[key];
  } else {
    delete all[key][marketplace];
    if (!all[key].eldorado && !all[key].zeusx) delete all[key];
  }
  writeAll(all);
}
