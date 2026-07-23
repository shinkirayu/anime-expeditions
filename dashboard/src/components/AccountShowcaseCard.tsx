import { forwardRef, useMemo, useState } from "react";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../lib/types";
import { fmtFullNum, getCurrencyEntry, raritySolid, rarityRank } from "../lib/format";
import { unitPoseImageUrl } from "../lib/unitImages";
import { AssetImage } from "./AssetImage";
import { SwordIcon } from "./icons";
import { UnitIconImage } from "./UnitIconImage";

const SIZE = 1000;

/**
 * Square, unit-hero-focused shareable snapshot — the account's rarest unit takes center stage
 * (full pose art when available), with a compact Level / Story / Gems / Trait Crystal strip.
 * Rendered off-screen at a fixed size and rasterized to PNG via exportShowcaseImage().
 */
export const AccountShowcaseCard = forwardRef<
  HTMLDivElement,
  { account: AccountRow; details: AccountDetailsRow | null | undefined }
>(function AccountShowcaseCard({ account, details }, ref) {
  const units = useMemo(() => (details?.units ?? []) as UnitEntry[], [details]);

  const featured = useMemo(
    () =>
      units.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0))[0],
    [units],
  );

  const gems = getCurrencyEntry(account.currencies, "gem");
  const traitCrystal = getCurrencyEntry(account.currencies, "trait crystal");
  const storyPercent = account.progress?.Story?.Percent ?? 0;
  const solid = raritySolid(featured?.Rarity);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] font-sans text-white"
      style={{
        width: SIZE,
        height: SIZE,
        background: `radial-gradient(circle at 50% 62%, ${solid}33, transparent 60%), #0d0a14`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      {featured && <FeaturedUnitArt unit={featured} />}

      {/* Bottom scrim for text legibility over the art */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)" }}
      />

      {/* Rarity-colored frame */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{ boxShadow: `inset 0 0 0 5px ${solid}, 0 0 50px 4px ${solid}55` }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-9">
        <div className="flex items-start justify-between">
          <span className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
            Anime Expeditions
          </span>
          {featured?.Rarity && (
            <span
              className="font-display text-outline rounded-lg px-2.5 py-1 text-xs font-bold uppercase"
              style={{ backgroundColor: solid }}
            >
              {featured.Rarity}
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-outline text-5xl leading-tight font-bold">
            {featured?.DisplayName || featured?.Asset || "No units yet"}
          </h1>
          {featured?.Trait?.DisplayName && (
            <p className="mt-1 text-sm font-semibold text-white/70">Trait: {featured.Trait.DisplayName}</p>
          )}

          <div className="mt-5 grid grid-cols-4 gap-2.5">
            <StatChip label="Level" value={String(account.level ?? "?")} />
            <StatChip label="Story" value={`${storyPercent}%`} />
            <StatChip
              label="Gems"
              value={fmtFullNum(gems?.Amount ?? 0)}
              icon={<AssetImage rbxAssetId={gems?.Icon} alt="Gems" className="size-4" fallback="💎" />}
            />
            <StatChip
              label="Trait Crystal"
              value={fmtFullNum(traitCrystal?.Amount ?? 0)}
              icon={<AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" className="size-4" fallback="🔮" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

function StatChip({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/40 px-2 py-2 text-center">
      <div className="text-[9px] font-semibold text-white/50 uppercase">{label}</div>
      <div className="font-display mt-0.5 flex items-center justify-center gap-1 text-base font-semibold tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}

/** Full pose art of the featured unit if the wiki has one, falling back to its (much smaller) icon art. */
function FeaturedUnitArt({ unit }: { unit: UnitEntry }) {
  const [poseFailed, setPoseFailed] = useState(false);
  const poseUrl = unitPoseImageUrl(unit.DisplayName);

  if (poseUrl && !poseFailed) {
    return (
      <img
        src={poseUrl}
        alt={unit.DisplayName ?? "Unit"}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setPoseFailed(true)}
        className="absolute bottom-0 left-1/2 h-[94%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      />
    );
  }

  return (
    <UnitIconImage
      displayName={unit.DisplayName}
      className="absolute bottom-0 left-1/2 h-[70%] w-auto -translate-x-1/2 object-contain opacity-90 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      fallback={
        <SwordIcon className="absolute bottom-[15%] left-1/2 size-24 -translate-x-1/2 text-white/70" />
      }
    />
  );
}
