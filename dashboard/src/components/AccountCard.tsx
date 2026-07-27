import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import type { ColumnPrefs } from "../lib/columnPrefs";
import {
  fmtNum,
  getBannerSecretPity,
  getCurrencyEntry,
  getLocationDetail,
  getLocationLabel,
  onlineStatusTitle,
  timeAgo,
} from "../lib/format";
import { BackpackIcon, SwordIcon } from "./icons";
import { AssetImage } from "./AssetImage";
import { CROW_RELIC_ICON } from "../lib/assetIcon";
import { wikiItemIconUrl } from "../lib/itemImages";
import { MiniProgressBar } from "./MiniProgressBar";
import { StageBadge } from "./StageBadge";

/** Stacked card view of AccountRow for narrow screens, where a 12-column table has to scroll sideways. */
export const AccountCard = memo(function AccountCard({
  account,
  columns,
  selected,
  onToggleSelect,
  onShowInventory,
  onShowUnits,
}: {
  account: AccountListRow;
  columns: ColumnPrefs;
  selected: boolean;
  onToggleSelect: (userId: number) => void;
  onShowInventory: (userId: number) => void;
  onShowUnits: (userId: number) => void;
}) {
  const online = isOnline(account.last_seen);
  const gems = getCurrencyEntry(account.currencies, "gem");
  const traitCrystal = getCurrencyEntry(account.currencies, "trait crystal");
  const crowRelic = getCurrencyEntry(account.currencies, "crowrelic");
  const villainCoins = getCurrencyEntry(account.currencies, "villain");
  const location = getLocationLabel(account.progress, online);
  const locationDetail = getLocationDetail(account.progress, online);
  const standardPity = getBannerSecretPity(account.pity, "Standard");
  const villainPity = getBannerSecretPity(account.pity, "VillainInvasion");

  const showBadges = columns.story || columns.raid || columns.villain;
  const showButtons = columns.unitsButton || columns.itemsButton;

  return (
    <div
      className={`cv-auto rounded-2xl border p-4 shadow-sm dark:bg-white/[0.03] ${
        selected
          ? "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
          : "border-zinc-200/80 bg-white dark:border-fuchsia-500/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(account.user_id)}
            className="size-3.5 shrink-0 accent-fuchsia-500"
            aria-label={`Select ${account.username}`}
          />
          <Link to={`/account/${account.user_id}`} className="group flex min-w-0 items-center gap-2.5">
            <span
              className={`size-2 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
              title={onlineStatusTitle(account.last_seen, online)}
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400">
                {account.display_name || account.username}
              </div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{account.username}</div>
            </div>
          </Link>
        </div>
        <div className="shrink-0 text-right text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
          <div className="font-display font-semibold text-zinc-700 dark:text-zinc-200">Lv {account.level ?? "—"}</div>
          {timeAgo(account.last_seen)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs tabular-nums">
        {columns.gems && (
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={gems?.Icon} alt="Gems" fallback="💎" />
            {fmtNum(gems?.Amount)}
          </span>
        )}
        {columns.traitCrystal && (
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" fallback="🔮" />
            {fmtNum(traitCrystal?.Amount ?? 0)}
          </span>
        )}
        {columns.crowRelic && (
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={crowRelic?.Icon ?? CROW_RELIC_ICON} alt="Crow Relic" fallback="🪶" />
            {fmtNum(crowRelic?.Amount ?? 0)}
          </span>
        )}
        {columns.villainCoins && (
          <span className="inline-flex items-center gap-1">
            <AssetImage
              src={wikiItemIconUrl("Villain Coins")}
              rbxAssetId={villainCoins?.Icon}
              alt="Villain Coins"
              fallback="👹"
            />
            {fmtNum(villainCoins?.Amount ?? 0)}
          </span>
        )}
        {columns.location && (
          <span
            title={locationDetail}
            className={`font-semibold ${
              account.in_match && online ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {location}
          </span>
        )}
        {columns.standardPity && standardPity != null && (
          <span className="inline-flex items-center gap-1" title="Standard banner Secret pity">
            🎯 {fmtNum(standardPity)}
          </span>
        )}
        {columns.villainPity && villainPity != null && (
          <span className="inline-flex items-center gap-1" title="Villain banner Secret pity">
            😈 {fmtNum(villainPity)}
          </span>
        )}
      </div>

      {showBadges && (
        <div className="mt-3 grid grid-cols-3 items-center gap-2 border-t border-zinc-100 pt-3 dark:border-white/[0.06]">
          {columns.story && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Story</span>
              <MiniProgressBar percent={account.progress?.Story?.Percent} completed={account.progress?.Story?.Completed} />
            </div>
          )}
          {columns.raid && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Raid</span>
              <StageBadge story={account.progress?.Raid} />
            </div>
          )}
          {columns.villain && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">Villain</span>
              <StageBadge story={account.progress?.VillainInvasion} />
            </div>
          )}
        </div>
      )}

      {showButtons && (
        <div className="mt-3 flex items-center gap-2">
          {columns.unitsButton && (
            <button
              onClick={() => onShowUnits(account.user_id)}
              className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-fuchsia-700 transition-colors hover:from-fuchsia-500/25 hover:to-purple-700/25 dark:border-fuchsia-500/30 dark:text-fuchsia-300"
            >
              {account.unit_count} <SwordIcon />
            </button>
          )}
          {columns.itemsButton && (
            <button
              onClick={() => onShowInventory(account.user_id)}
              className="font-display flex flex-1 items-center justify-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-fuchsia-700 transition-colors hover:from-fuchsia-500/25 hover:to-purple-700/25 dark:border-fuchsia-500/30 dark:text-fuchsia-300"
            >
              {account.item_count} <BackpackIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
