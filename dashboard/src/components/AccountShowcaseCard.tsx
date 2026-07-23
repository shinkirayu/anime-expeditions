import { forwardRef, useMemo, type ReactNode } from "react";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../lib/types";
import { assetIconUrl } from "../lib/assetIcon";
import { fmtFullNum, getCurrencyEntry, rarityBoxStyle, rarityRank } from "../lib/format";
import { wikiItemIconUrl } from "../lib/itemImages";
import { unitPoseImageUrl } from "../lib/unitImages";
import { useImageDataUrl } from "../hooks/useImageDataUrl";
import { SwordIcon } from "./icons";
import { UnitIconImage } from "./UnitIconImage";

const SIZE = 1000;

/** Pose art size (% of card height) and position (% from left/top) — differs per unit since wiki pose art isn't uniformly framed, so the caller can expose this as adjustable controls. */
export interface PoseTransform {
  size: number;
  x: number;
  y: number;
}

export const DEFAULT_POSE_TRANSFORM: PoseTransform = { size: 220, x: 58, y: 50 };

/** Which stat pills to show — all on by default, toggleable by the caller (e.g. checkboxes). */
export interface VisibleStats {
  level: boolean;
  gems: boolean;
  traits: boolean;
  story: boolean;
}

export const DEFAULT_VISIBLE_STATS: VisibleStats = { level: true, gems: true, traits: true, story: true };

const PILL_COLORS = {
  gems: "rgb(56, 189, 248)",
  traits: "rgb(244, 114, 182)",
  level: "rgb(74, 222, 128)",
  story: "rgb(167, 139, 250)",
  unitTrait: "rgb(251, 191, 36)",
};

/**
 * Square, unit-hero-focused shareable snapshot — background matches the featured unit's rarity
 * box treatment (same as the Units page), the account's rarest unit large on the right (full pose
 * art when available), stat pills (Gems/Trait Crystal/Level/Story) stacked down the left edge, the
 * unit's own trait badged top-right. Rendered off-screen at a fixed size and rasterized to PNG via
 * renderShowcasePng().
 */
export const AccountShowcaseCard = forwardRef<
  HTMLDivElement,
  {
    account: AccountRow;
    details: AccountDetailsRow | null | undefined;
    pose?: PoseTransform;
    visibleStats?: VisibleStats;
    /** Force a specific unit as the hero art instead of auto-picking the rarest/highest-level one. */
    unitId?: string | null;
  }
>(function AccountShowcaseCard(
  { account, details, pose = DEFAULT_POSE_TRANSFORM, visibleStats = DEFAULT_VISIBLE_STATS, unitId },
  ref,
) {
  const units = useMemo(() => (details?.units ?? []) as UnitEntry[], [details]);

  const bestUnit = useMemo(
    () =>
      units.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0))[0],
    [units],
  );
  const featured = (unitId && units.find((u) => u.UniqueId === unitId)) || bestUnit;

  const gems = getCurrencyEntry(account.currencies, "gem");
  const traitCrystal = getCurrencyEntry(account.currencies, "trait crystal");
  const story = account.progress?.Story;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] font-sans text-white"
      style={{ width: SIZE, height: SIZE, ...rarityBoxStyle(featured?.Rarity) }}
    >
      {featured && <FeaturedUnitArt unit={featured} pose={pose} />}

      {featured?.Trait?.DisplayName && (
        <div className="relative z-10 flex justify-end p-9">
          <StatPill borderColor={PILL_COLORS.unitTrait} compact>
            {featured.Trait.DisplayName}
          </StatPill>
        </div>
      )}

      <div className="absolute top-9 bottom-9 left-9 z-10 flex flex-col justify-center gap-4">
        {visibleStats.gems && (
          <StatPill borderColor={PILL_COLORS.gems} icon={<CurrencyIcon name="Gems" rbxAssetId={gems?.Icon} alt="Gems" fallback="💎" className="size-[64px]" />}>
            {fmtFullNum(gems?.Amount ?? 0)}
          </StatPill>
        )}
        {visibleStats.traits && (
          <StatPill
            borderColor={PILL_COLORS.traits}
            icon={<CurrencyIcon name="Trait Crystal" rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" fallback="🔮" className="size-[64px]" />}
          >
            {fmtFullNum(traitCrystal?.Amount ?? 0)}
          </StatPill>
        )}
        {visibleStats.level && <StatPill borderColor={PILL_COLORS.level}>LVL {account.level ?? "?"}</StatPill>}
        {visibleStats.story && (
          <StatPill borderColor={PILL_COLORS.story} small>
            {story?.Completed ? (
              <>
                Story Mode
                <br />
                Completed!
              </>
            ) : (
              <>
                Story Mode
                <br />
                {story?.Percent ?? 0}%
              </>
            )}
          </StatPill>
        )}
      </div>
    </div>
  );
});

function StatPill({
  borderColor,
  icon,
  small,
  compact,
  children,
}: {
  borderColor: string;
  icon?: ReactNode;
  small?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`font-display text-outline flex w-fit items-center gap-3 rounded-2xl bg-black/55 font-bold ${compact ? "px-4 py-2" : "px-6 py-4"}`}
      style={{ border: `3px solid ${borderColor}`, boxShadow: `0 0 18px ${borderColor}99, inset 0 0 14px ${borderColor}33` }}
    >
      {icon}
      <span className={`leading-tight ${compact ? "text-[36px]" : small ? "text-[32px] uppercase" : "text-[58px]"} tabular-nums`}>
        {children}
      </span>
    </div>
  );
}

/** Full pose art of the featured unit if the wiki has one, falling back to its (much smaller) icon art. Position/size are adjustable per-unit since wiki pose art isn't uniformly framed. */
function FeaturedUnitArt({ unit, pose }: { unit: UnitEntry; pose: PoseTransform }) {
  const poseUrl = unitPoseImageUrl(unit.DisplayName);
  const poseDataUrl = useImageDataUrl(poseUrl);

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    top: `${pose.y}%`,
    left: `${pose.x}%`,
    width: "auto",
    maxWidth: "none",
    transform: "translate(-50%, -50%)",
  };

  if (poseDataUrl) {
    return (
      <img
        src={poseDataUrl}
        alt={unit.DisplayName ?? "Unit"}
        style={{ ...positionStyle, height: `${pose.size}%` }}
        className="object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      />
    );
  }

  return (
    <UnitIconImage
      displayName={unit.DisplayName}
      style={{ ...positionStyle, height: `${pose.size * 0.73}%` }}
      className="object-contain opacity-90 drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      fallback={
        <SwordIcon
          className="size-[220px] text-white/70"
          style={{ position: "absolute", top: `${pose.y}%`, left: `${pose.x}%`, transform: "translate(-50%, -50%)" }}
        />
      }
    />
  );
}

/** Currency icon (Gems, Trait Crystal, ...) — tries the wiki's icon art first, then the Roblox asset-icon proxy, both pre-inlined as data URLs (see useImageDataUrl). */
export function CurrencyIcon({
  name,
  rbxAssetId,
  alt,
  fallback,
  className,
}: {
  name: string;
  rbxAssetId?: string;
  alt: string;
  fallback: string;
  className: string;
}) {
  const dataUrl = useImageDataUrl(wikiItemIconUrl(name) ?? assetIconUrl(rbxAssetId));
  if (!dataUrl) return <span className="text-[52px] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{fallback}</span>;
  return <img src={dataUrl} alt={alt} className={`${className} shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]`} />;
}
