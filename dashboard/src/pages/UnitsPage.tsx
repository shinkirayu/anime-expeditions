import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllUnits } from "../hooks/useAllUnits";
import { rarityClass } from "../lib/format";

export default function UnitsPage() {
  const { data: units, isLoading, isError } = useAllUnits();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const all = units ?? [];
    const term = filter.trim().toLowerCase();
    return term
      ? all.filter((u) => `${u.displayName} ${u.rarity ?? ""} ${u.element ?? ""}`.toLowerCase().includes(term))
      : all;
  }, [units, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Units</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every unit across all of your tracked accounts. Click one to see who has it.
          </p>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter units…"
          className="rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
        />
      </div>

      {isError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Failed to load units.
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse rounded-xl bg-zinc-100 p-16 dark:bg-zinc-900" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No units yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <th className="py-2 pl-3 pr-2 font-medium">Unit</th>
                <th className="px-2 py-2 font-medium">Rarity</th>
                <th className="px-2 py-2 font-medium">Element</th>
                <th className="px-2 py-2 text-right font-medium">Accounts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isOpen = expanded === u.key;
                return (
                  <Fragment key={u.key}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : u.key)}
                      className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60"
                    >
                      <td className="py-2 pr-2 pl-3 font-medium">
                        <span className="mr-1 inline-block w-3 text-zinc-400">{isOpen ? "▾" : "▸"}</span>
                        {u.displayName}
                      </td>
                      <td className={`px-2 py-2 ${rarityClass(u.rarity)}`}>{u.rarity ?? "—"}</td>
                      <td className="px-2 py-2 text-zinc-500 dark:text-zinc-400">{u.element ?? "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{u.owners.length}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-zinc-100 dark:border-zinc-800/60">
                        <td colSpan={4} className="bg-zinc-50 px-4 py-3 dark:bg-zinc-900/40">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {u.owners.map((o) => (
                              <Link
                                key={o.UniqueId}
                                to={`/account/${o.user_id}`}
                                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                              >
                                <span className="truncate font-medium">
                                  {o.display_name || o.username}
                                </span>
                                <span className="ml-2 shrink-0 text-zinc-500 dark:text-zinc-400">
                                  Lv {o.Level ?? "—"} {o.Equipped ? "· equipped" : ""}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
