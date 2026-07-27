import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import type { ColumnPrefs } from "../lib/columnPrefs";
import {
  fmtNum,
  getCurrencyEntry,
  getLocationDetail,
  getLocationLabel,
  getSecretPitySummary,
  onlineStatusTitle,
  timeAgo,
} from "../lib/format";
import { BackpackIcon, SwordIcon } from "./icons";
import { AssetImage } from "./AssetImage";
import { CROW_RELIC_ICON } from "../lib/assetIcon";
import { wikiItemIconUrl } from "../lib/itemImages";
import { MiniProgressBar } from "./MiniProgressBar";
import { StageBadge } from "./StageBadge";

/** Memoized so a realtime patch to one row never re-renders the whole table. */
export const AccountRow = memo(function AccountRow({
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
  const secretPity = getSecretPitySummary(account.pity);

  return (
    <tr
      className={`cv-auto border-b align-middle last:border-0 hover:bg-zinc-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
        selected ? "bg-fuchsia-50 dark:bg-fuchsia-500/10" : "border-zinc-100"
      }`}
    >
      <td className="py-2.5 pr-0 pl-4 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(account.user_id)}
          className="size-3.5 accent-fuchsia-500"
          aria-label={`Select ${account.username}`}
        />
      </td>
      <td className="py-2.5 pr-3 pl-3 align-middle">
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
      </td>
      <td className="px-3 py-2.5 text-center align-middle tabular-nums">{account.level ?? "—"}</td>
      {columns.gems && (
        <td className="px-3 py-2.5 text-center align-middle tabular-nums">
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={gems?.Icon} alt="Gems" fallback="💎" />
            {fmtNum(gems?.Amount)}
          </span>
        </td>
      )}
      {columns.traitCrystal && (
        <td className="px-3 py-2.5 text-center align-middle tabular-nums">
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" fallback="🔮" />
            {fmtNum(traitCrystal?.Amount ?? 0)}
          </span>
        </td>
      )}
      {columns.crowRelic && (
        <td className="px-3 py-2.5 text-center align-middle tabular-nums">
          <span className="inline-flex items-center gap-1">
            <AssetImage rbxAssetId={crowRelic?.Icon ?? CROW_RELIC_ICON} alt="Crow Relic" fallback="🪶" />
            {fmtNum(crowRelic?.Amount ?? 0)}
          </span>
        </td>
      )}
      {columns.villainCoins && (
        <td className="px-3 py-2.5 text-center align-middle tabular-nums">
          <span className="inline-flex items-center gap-1">
            <AssetImage
              src={wikiItemIconUrl("Villain Coins")}
              rbxAssetId={villainCoins?.Icon}
              alt="Villain Coins"
              fallback="👹"
            />
            {fmtNum(villainCoins?.Amount ?? 0)}
          </span>
        </td>
      )}
      {columns.secretPity && (
        <td className="truncate px-3 py-2.5 text-center align-middle text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
          {secretPity ?? "—"}
        </td>
      )}
      {columns.story && (
        <td className="px-3 py-2.5 text-center align-middle">
          <MiniProgressBar percent={account.progress?.Story?.Percent} completed={account.progress?.Story?.Completed} />
        </td>
      )}
      {columns.raid && (
        <td className="px-3 py-2.5 text-center align-middle">
          <StageBadge story={account.progress?.Raid} />
        </td>
      )}
      {columns.villain && (
        <td className="px-3 py-2.5 text-center align-middle">
          <StageBadge story={account.progress?.VillainInvasion} />
        </td>
      )}
      {columns.unitsButton && (
        <td className="px-3 py-2.5 text-center align-middle">
          <button
            onClick={() => onShowUnits(account.user_id)}
            className="font-display inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1 text-xs font-semibold tabular-nums text-fuchsia-700 transition-all hover:from-fuchsia-500/25 hover:to-purple-700/25 hover:shadow-[0_0_10px_rgba(129,19,255,0.4)] dark:border-fuchsia-500/30 dark:text-fuchsia-300"
          >
            {account.unit_count} <SwordIcon />
          </button>
        </td>
      )}
      {columns.itemsButton && (
        <td className="px-3 py-2.5 text-center align-middle">
          <button
            onClick={() => onShowInventory(account.user_id)}
            className="font-display inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1 text-xs font-semibold tabular-nums text-fuchsia-700 transition-all hover:from-fuchsia-500/25 hover:to-purple-700/25 hover:shadow-[0_0_10px_rgba(129,19,255,0.4)] dark:border-fuchsia-500/30 dark:text-fuchsia-300"
          >
            {account.item_count} <BackpackIcon />
          </button>
        </td>
      )}
      {columns.location && (
        <td
          title={locationDetail}
          className={`truncate px-3 py-2.5 text-center align-middle text-xs font-semibold whitespace-nowrap ${
            account.in_match && online
              ? "text-amber-600 dark:text-amber-400"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {location}
        </td>
      )}
      <td className="py-2.5 pr-4 pl-3 text-right align-middle text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {timeAgo(account.last_seen)}
      </td>
    </tr>
  );
});
