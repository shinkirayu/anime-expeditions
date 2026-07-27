import { rarityBoxStyle } from "../lib/format";
import type { EquipmentStatEntry } from "../lib/types";
import { AssetImage } from "./AssetImage";

/** Same rarity-box tile as ItemCard, plus a rolled-stat line underneath the name (e.g. "Damage +1.72 · SPA -1.56"). */
export function EquipmentCard({
  name,
  rarity,
  icon,
  stats,
  fallback,
}: {
  name: string;
  rarity?: string;
  icon?: string;
  stats?: EquipmentStatEntry[];
  fallback?: string;
}) {
  const statLine = (stats ?? [])
    .filter((s): s is Required<EquipmentStatEntry> => s.Stat != null && s.Value != null)
    .map((s) => `${s.Stat} ${s.Value > 0 ? "+" : ""}${s.Value}`)
    .join(" · ");

  return (
    <div style={rarityBoxStyle(rarity)} className="relative aspect-square overflow-hidden rounded-[11px]">
      <AssetImage
        rbxAssetId={icon}
        alt={name}
        className="absolute inset-0 h-full w-full object-contain p-2.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
        fallback={<span className="absolute inset-0 flex items-center justify-center text-6xl">{fallback}</span>}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pt-6 pb-1 text-center">
        <span className="font-display text-outline block truncate text-sm font-semibold">{name}</span>
        {statLine && <span className="block truncate text-[10px] text-white/80">{statLine}</span>}
      </div>
    </div>
  );
}
