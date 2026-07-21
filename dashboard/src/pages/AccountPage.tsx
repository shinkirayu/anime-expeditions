import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount, useAccountDetails } from "../hooks/useAccountDetail";
import { useAccountRealtime } from "../hooks/useAccountsRealtime";
import { isOnline, type UnitEntry } from "../lib/types";
import { fmtFullNum, fmtNum, fmtPlaytime, getGemsAmount, rarityClass, timeAgo } from "../lib/format";
import { BarChart } from "../components/BarChart";

const UNIT_PAGE = 60;

export default function AccountPage() {
  const params = useParams();
  const userId = params.userId ? Number(params.userId) : null;
  const { data: account, isLoading, isError } = useAccount(userId);
  const details = useAccountDetails(userId);
  useAccountRealtime(userId);

  const [unitLimit, setUnitLimit] = useState(UNIT_PAGE);
  const [unitFilter, setUnitFilter] = useState("");

  const units = useMemo(() => {
    const all = (details.data?.units ?? []) as UnitEntry[];
    const term = unitFilter.trim().toLowerCase();
    const filtered = term
      ? all.filter((u) =>
          `${u.DisplayName ?? ""} ${u.Asset ?? ""} ${u.Rarity ?? ""}`.toLowerCase().includes(term),
        )
      : all;
    return filtered
      .slice()
      .sort((a, b) => (b.Level ?? 0) - (a.Level ?? 0) || Number(!!b.Equipped) - Number(!!a.Equipped));
  }, [details.data, unitFilter]);

  const rarityDist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of (details.data?.units ?? []) as UnitEntry[]) {
      const r = u.Rarity ?? "Unknown";
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts, ([label, value]) => ({ label, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [details.data]);

  const gems = useMemo(() => getGemsAmount(account?.currencies), [account]);

  // Gems shown as the first inventory row instead of a separate currency section.
  const inventory = useMemo(() => {
    const items = Object.entries(details.data?.inventory ?? {}).sort(
      ([, a], [, b]) => (b.Amount ?? 0) - (a.Amount ?? 0),
    );
    return [["__gems", { DisplayName: "Gems", Amount: gems, SubType: "Currency" }], ...items] as [
      string,
      { DisplayName?: string; Amount: number; SubType?: string; Rarity?: string },
    ][];
  }, [details.data, gems]);

  if (isLoading) {
    return <div className="animate-pulse rounded-xl bg-zinc-100 p-16 dark:bg-zinc-900" />;
  }
  if (isError || !account) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        Account not found.{" "}
        <Link to="/" className="underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const online = isOnline(account.last_seen);
  const stats = account.stats ?? {};
  const playtime = Number(stats["Playtime"] ?? stats["PlayTime"] ?? stats["TimePlayed"]);

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← All accounts
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {account.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{account.display_name || account.username}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  online
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {online ? (account.in_match ? "IN MATCH" : "ONLINE") : "OFFLINE"}
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @{account.username} · ID {account.user_id} · updated {timeAgo(account.updated_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">Lv {account.level ?? "?"}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {fmtFullNum(account.exp)} EXP
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="Gems" value={`💎 ${fmtFullNum(gems)}`} />
          <Tile label="Units" value={fmtFullNum(account.unit_count)} />
          <Tile label="Items" value={fmtFullNum(account.item_count)} />
          <Tile
            label="Maps cleared"
            value={fmtFullNum(account.progress?.CompletedMapsCount ?? 0)}
          />
          <Tile label="Playtime" value={fmtPlaytime(Number.isFinite(playtime) ? playtime : null)} />
        </div>
      </div>

      {/* Live match state */}
      {account.in_match && account.progress?.LiveState != null && (
        <Section title="Live match state">
          <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800/60">
            {JSON.stringify(account.progress.LiveState, null, 2)}
          </pre>
        </Section>
      )}

      {/* Units */}
      <Section
        title={`Units (${details.data?.units?.length ?? 0})`}
        right={
          <input
            type="search"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            placeholder="Filter units…"
            className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-zinc-700"
          />
        }
      >
        {details.isLoading ? (
          <Empty>Loading units…</Empty>
        ) : units.length === 0 ? (
          <Empty>No units.</Empty>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="py-2 pr-3 font-medium">Unit</th>
                    <th className="py-2 pr-3 font-medium">Rarity</th>
                    <th className="py-2 pr-3 font-medium">Level</th>
                    <th className="py-2 pr-3 font-medium">Takedowns</th>
                    <th className="py-2 font-medium">Equipped</th>
                  </tr>
                </thead>
                <tbody>
                  {units.slice(0, unitLimit).map((u) => (
                    <tr
                      key={u.UniqueId}
                      className="cv-auto border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                    >
                      <td className="py-2 pr-3 font-medium">{u.DisplayName || u.Asset}</td>
                      <td className={`py-2 pr-3 ${rarityClass(u.Rarity)}`}>{u.Rarity ?? "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{u.Level ?? "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtNum(u.TotalTakedowns)}</td>
                      <td className="py-2">{u.Equipped ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {units.length > unitLimit && (
              <button
                onClick={() => setUnitLimit((n) => n + UNIT_PAGE)}
                className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Show more ({units.length - unitLimit} remaining)
              </button>
            )}
          </>
        )}
      </Section>

      {/* Inventory + charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title={`Inventory (${inventory.length})`}>
          {details.isLoading ? (
            <Empty>Loading…</Empty>
          ) : inventory.length === 0 ? (
            <Empty>No items.</Empty>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
              {inventory.map(([name, item]) => (
                <div
                  key={name}
                  className="cv-auto flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/60"
                >
                  <span className={`truncate ${rarityClass(item.Rarity)}`}>
                    {name === "__gems" && "💎 "}
                    {item.DisplayName || name}
                    {item.SubType && name !== "__gems" && (
                      <span className="ml-2 text-[10px] text-zinc-400">{item.SubType}</span>
                    )}
                  </span>
                  <span className="ml-3 shrink-0 font-semibold tabular-nums">
                    ×{fmtFullNum(item.Amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
        <BarChart title="Units by rarity" data={rarityDist} />
      </div>

      {/* Raw stats */}
      {Object.keys(stats).length > 0 && (
        <Section title="Stats">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{k}</div>
                <div className="truncate text-sm font-semibold tabular-nums">
                  {typeof v === "number" ? fmtFullNum(v) : String(v)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-zinc-800/60">
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-zinc-400">{children}</p>;
}
