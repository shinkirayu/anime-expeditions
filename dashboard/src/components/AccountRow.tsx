import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import { fmtNum, getGemsAmount, timeAgo } from "../lib/format";

/** Memoized so a realtime patch to one row never re-renders the whole table. */
export const AccountRow = memo(function AccountRow({
  account,
  onShowInventory,
}: {
  account: AccountListRow;
  onShowInventory: (userId: number) => void;
}) {
  const online = isOnline(account.last_seen);
  const gems = getGemsAmount(account.currencies);

  return (
    <tr className="cv-auto border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60">
      <td className="py-2 pl-3 pr-2">
        <Link to={`/account/${account.user_id}`} className="group flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {account.username.slice(0, 2).toUpperCase()}
            </div>
            <span
              className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
              }`}
              title={online ? "Online" : "Offline"}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {account.display_name || account.username}
              </span>
              {account.in_match && online && (
                <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  IN MATCH
                </span>
              )}
            </div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">@{account.username}</div>
          </div>
        </Link>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{account.level ?? "—"}</td>
      <td className="px-2 py-2 text-right tabular-nums">
        <span className="text-indigo-600 dark:text-indigo-400">💎</span> {fmtNum(gems)}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{account.unit_count}</td>
      <td className="px-2 py-2 text-right tabular-nums">{account.item_count}</td>
      <td className="px-2 py-2 text-right text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">
        {timeAgo(account.last_seen)}
      </td>
      <td className="py-2 pr-3 pl-2 text-right">
        <button
          onClick={() => onShowInventory(account.user_id)}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Inventory
        </button>
      </td>
    </tr>
  );
});
