import { forwardRef, useMemo } from "react";
import type { AccountDetailsRow, AccountRow, InventoryEntry } from "../lib/types";
import { rarityRank } from "../lib/format";
import { ItemCard } from "./ItemCard";

const SIZE = 1000;
const MAX_SHOWN = 24;
export const DEFAULT_ITEM_COLUMNS = 6;

/** Square gallery of the account's most valuable items — same rarity-box tile as items.html, sorted rarity-first then amount. */
export const InventoryShowcaseCard = forwardRef<
  HTMLDivElement,
  { account: AccountRow; details: AccountDetailsRow | null | undefined; columns?: number }
>(function InventoryShowcaseCard({ account, details, columns = DEFAULT_ITEM_COLUMNS }, ref) {
  const items = useMemo(() => {
    const currencyNames = new Set(Object.keys(account.currencies ?? {}));
    return Object.entries(details?.inventory ?? ({} as Record<string, InventoryEntry>))
      .filter(([name]) => !currencyNames.has(name))
      .sort(([, a], [, b]) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Amount ?? 0) - (a.Amount ?? 0));
  }, [account.currencies, details]);

  const shown = items.slice(0, MAX_SHOWN);
  const remaining = items.length - shown.length;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] bg-[#0d0a14] font-sans text-white"
      style={{ width: SIZE, height: SIZE }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="relative z-10 flex h-full flex-col p-9">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-outline text-4xl font-bold">Inventory</h1>
          <span className="text-sm font-semibold text-white/50 uppercase">{items.length} items</span>
        </div>

        <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {shown.map(([name, item]) => (
            <ItemCard
              key={name}
              name={item.DisplayName || name}
              amount={item.Amount}
              rarity={item.Rarity}
              icon={item.Icon}
              fallback="📦"
            />
          ))}
        </div>

        {remaining > 0 && (
          <p className="mt-4 text-center text-sm font-semibold text-white/40">+{remaining} more items</p>
        )}
      </div>
    </div>
  );
});
