import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import { fmtNum, getGemsAmount, getLocationLabel, timeAgo } from "../lib/format";
import { BackpackIcon, SwordIcon } from "./icons";

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
  const gems = getGemsAmount(account.currencies);
  const location = getLocationLabel(account.progress);

  return (
    <tr className="cv-auto border-b border-zinc-100 align-middle last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60">
      <td className="py-2.5 pr-3 pl-4 align-middle">
        <Link to={`/account/${account.user_id}`} className="group flex min-w-0 items-center gap-2.5">
          <span
            className={`size-2 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
            title={online ? "Online" : "Offline"}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {account.display_name || account.username}
            </div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{account.username}</div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-center align-middle tabular-nums">{account.level ?? "—"}</td>
      <td className="px-3 py-2.5 text-center align-middle tabular-nums">
        💎 {fmtNum(gems)}
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <button
          onClick={() => onShowUnits(account.user_id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium tabular-nums text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {account.unit_count} <SwordIcon />
        </button>
      </td>
      <td className="px-3 py-2.5 text-center align-middle">
        <button
          onClick={() => onShowInventory(account.user_id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium tabular-nums text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
