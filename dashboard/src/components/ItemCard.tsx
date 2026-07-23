import { fmtFullNum, rarityBoxStyle } from "../lib/format";
import { wikiItemIconUrl } from "../lib/itemImages";
import { AssetImage } from "./AssetImage";

/** Blocky square item tile — same rarity-box treatment as units (items.html uses the identical template). Icon fills nearly the whole tile; badge/name float on top of it. */
export function ItemCard({
  name,
  amount,
  rarity,
  icon,
  fallback,
}: {
  name: string;
  amount: number;
  rarity?: string;
  icon?: string;
  fallback?: string;
}) {
  return (
    <div style={rarityBoxStyle(rarity)} className="relative aspect-square overflow-hidden rounded-[11px]">
      <AssetImage
        src={wikiItemIconUrl(name)}
        rbxAssetId={icon}
        alt={name}
        className="absolute inset-0 h-full w-full object-contain p-2.5 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
        fallback={<span className="absolute inset-0 flex items-center justify-center text-6xl">{fallback}</span>}
      />
      <span className="font-display absolute top-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-sm leading-none font-bold text-white">
        ×{fmtFullNum(amount)}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pt-5 pb-1 text-center">
        <span className="font-display text-outline block truncate text-sm font-semibold">{name}</span>
      </div>
    </div>
  );
}
