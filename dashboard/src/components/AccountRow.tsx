import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import { fmtNum, getCurrencyEntry, getLocationLabel, timeAgo } from "../lib/format";
import { BackpackIcon, SwordIcon } from "./icons";
import { AssetImage } from "./AssetImage";

/** Memoized so a realtime patch to one row never re-renders the whole table. */
export const AccountRow = memo(function AccountRow({
  account,
  onShowInventory,
  onShowUnits,
}: {
  account: AccountListRow;
  onShowInventory: (userId: number) => void;
  onShowUnits: (userId: number) => void;
}) {
  const online = isOnline(account.last_seen);
  const gems = getCurrencyEntry(account.currencies, "gem");
  const traitCrystal = getCurrencyEntry(account.currencies, "trait crystal");
  const location = getLocationLabel(account.progress);

  return (
    <tr className="cv-auto border-b border-zinc-100 align-middle last:border-0 hover:bg-zinc-50 dark:border-white/[0.04] dark:hover:bg-white/[0.03]">
      <td className="py-2.5 pr-3 pl-4 align-middle">
        <Link to={`/account/${account.user_id}`} className="group flex min-w-0 items-center gap-2.5">
          <span
            className={`size-2 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
            title={online ? "Online" : "Offline"}
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
      <td className="px-3 py-2.5 text-center align-middle tabular-nums">
        <span className="inline-flex items-center gap-1">
          <AssetImage rbxAssetId={gems?.Icon} alt="Gems" fallback="💎" />
          {fmtNum(gems?.Amount)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center align-middle tabular-nums">
        <span className="inline-flex items-center gap-1">
          <AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" fallback="🔮" />
          {fmtNum(traitCrystal?.Amount ?? 0)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <button
          onClick={() => onShowUnits(account.user_id)}
          className="font-display inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1 text-xs font-semibold tabular-nums text-fuchsia-700 transition-all hover:from-fuchsia-500/25 hover:to-purple-700/25 hover:shadow-[0_0_10px_rgba(129,19,255,0.4)] dark:border-fuchsia-500/30 dark:text-fuchsia-300"
        >
          {account.unit_count} <SwordIcon />
        </button>
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <button
          onClick={() => onShowInventory(account.user_id)}
          className="font-display inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/70 bg-gradient-to-b from-fuchsia-500/10 to-purple-700/10 px-3 py-1 text-xs font-semibold tabular-nums text-fuchsia-700 transition-all hover:from-fuchsia-500/25 hover:to-purple-700/25 hover:shadow-[0_0_10px_rgba(129,19,255,0.4)] dark:border-fuchsia-500/30 dark:text-fuchsia-300"
        >
          {account.item_count} <BackpackIcon />
        </button>
      </td>
      <td className="truncate px-3 py-2.5 text-center align-middle text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {account.in_match && (
          <span className="mr-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            MATCH
          </span>
        )}
        {location}
      </td>
      <td className="py-2.5 pr-4 pl-3 text-right align-middle text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {timeAgo(account.last_seen)}
      </td>
    </tr>
  );
});
