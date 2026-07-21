import { fmtFullNum, rarityCardBg } from "../lib/format";
import { AssetImage } from "./AssetImage";

/** Blocky square item tile — echoes the game's own inventory tile style (colored by rarity, big qty badge, bold name). */
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
    <div
      className={`relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b p-2 shadow-sm ${rarityCardBg(rarity)}`}
    >
      <span className="font-display self-start rounded-md bg-black/50 px-1.5 py-0.5 text-sm leading-none font-bold text-white">
        ×{fmtFullNum(amount)}
      </span>
      <AssetImage
        rbxAssetId={icon}
        alt={name}
        className="size-11 drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
        fallback={<span className="text-4xl">{fallback}</span>}
      />
      <span className="font-display text-outline w-full truncate text-center text-sm font-semibold">
        {name}
      </span>
    </div>
  );
}
