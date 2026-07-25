import { RARITY_ORDER, fmtFullNum, getCurrencyEntry } from "./format";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "./types";

/** Builds a sensible default listing title/description from a tracked account's stats. */
export function buildDefaultTitle(account: AccountRow): string {
  return `Anime Expeditions Account — Lv ${account.level ?? "?"} · ${account.unit_count} units`;
}

export function buildDefaultDescription(account: AccountRow, details: AccountDetailsRow | null | undefined): string {
  const gems = getCurrencyEntry(account.currencies, "gem")?.Amount ?? 0;
  const units = (details?.units ?? []) as UnitEntry[];
  const rarityCounts = new Map<string, number>();
  for (const u of units) {
    const r = u.Rarity ?? "Unknown";
    rarityCounts.set(r, (rarityCounts.get(r) ?? 0) + 1);
  }
  const rarityLine = RARITY_ORDER.filter((r) => rarityCounts.has(r))
    .map((r) => `${rarityCounts.get(r)} ${r}`)
    .join(", ");
  const maps = account.progress?.CompletedMapsCount;

  return [
    `Anime Expeditions account — Level ${account.level ?? "?"}.`,
    `Gems: ${fmtFullNum(gems)}`,
    `Units: ${account.unit_count}${rarityLine ? ` (${rarityLine})` : ""}`,
    `Items: ${account.item_count}`,
    maps ? `Maps cleared: ${maps}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
