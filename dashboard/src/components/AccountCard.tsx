import { memo } from "react";
import { Link } from "react-router-dom";
import type { AccountListRow } from "../lib/types";
import { isOnline } from "../lib/types";
import { fmtNum, timeAgo } from "../lib/format";

/**
 * Memoized so realtime patches to one row never re-render the whole grid.
 * `cv-auto` (content-visibility) skips rendering off-screen cards.
 */
export const AccountCard = memo(function AccountCard({ account }: { account: AccountListRow }) {
  const online = isOnline(account.last_seen);
  const currencies = Object.entries(account.currencies ?? {}).slice(0, 3);

  return (
    <Link
      to={`/account/${account.user_id}`}
      className="cv-auto group block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {account.username.slice(0, 2).toUpperCase()}
          </div>
          <span
            className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white dark:border-zinc-900 ${
              online ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
            }`}
            title={online ? "Online" : "Offline"}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {account.display_name || account.username}
            </span>
            {account.in_match && online && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                IN MATCH
              </span>
            )}
          </div>
          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            @{account.username} · Lv {account.level ?? "?"} · {timeAgo(account.last_seen)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {currencies.length > 0 ? (
          currencies.map(([name, c]) => (
            <div key={name} className="rounded-lg bg-zinc-50 px-1 py-1.5 dark:bg-zinc-800/60">
              <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                {c.DisplayName || name}
              </div>
              <div className="text-sm font-semibold tabular-nums">{fmtNum(c.Amount)}</div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-lg bg-zinc-50 py-1.5 text-xs text-zinc-400 dark:bg-zinc-800/60">
            no currency data
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{account.unit_count} units</span>
        <span>{account.item_count} items</span>
        <span>{fmtNum(account.exp)} EXP</span>
      </div>
    </Link>
  );
});
