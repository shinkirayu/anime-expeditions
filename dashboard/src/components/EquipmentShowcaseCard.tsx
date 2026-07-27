import { forwardRef, useMemo } from "react";
import type { AccountDetailsRow, AccountRow, EquipmentEntry } from "../lib/types";
import { rarityRank } from "../lib/format";
import { EquipmentCard } from "./EquipmentCard";

const SIZE = 1000;
const MAX_SHOWN = 24;
export const DEFAULT_EQUIPMENT_COLUMNS = 6;

/** Square gallery of the account's equipment — same rarity-box tile as InventoryShowcaseCard, sorted rarity-first. */
export const EquipmentShowcaseCard = forwardRef<
  HTMLDivElement,
  { account: AccountRow; details: AccountDetailsRow | null | undefined; columns?: number }
>(function EquipmentShowcaseCard({ details, columns = DEFAULT_EQUIPMENT_COLUMNS }, ref) {
  const equipment = useMemo(() => {
    const all = (details?.equipment ?? []) as EquipmentEntry[];
    return all.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity));
  }, [details]);

  const shown = equipment.slice(0, MAX_SHOWN);
  const remaining = equipment.length - shown.length;

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
          <h1 className="font-display text-outline text-4xl font-bold">Equipment</h1>
          <span className="text-sm font-semibold text-white/50 uppercase">{equipment.length} pieces</span>
        </div>

        <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {shown.map((e) => (
            <EquipmentCard
              key={e.UniqueId}
              name={e.DisplayName || e.Asset || "Equipment"}
              rarity={e.Rarity}
              icon={e.Icon}
              stats={e.Stats}
              fallback="🛡️"
            />
          ))}
        </div>

        {remaining > 0 && (
          <p className="mt-4 text-center text-sm font-semibold text-white/40">+{remaining} more equipment</p>
        )}
      </div>
    </div>
  );
});
