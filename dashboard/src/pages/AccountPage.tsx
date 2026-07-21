import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount, useAccountDetails } from "../hooks/useAccountDetail";
import { useAccountRealtime } from "../hooks/useAccountsRealtime";
import { isOnline, type UnitEntry } from "../lib/types";
import { fmtFullNum, fmtNum, fmtPlaytime, getCurrencyEntry, rarityClass, timeAgo } from "../lib/format";
import { BarChart } from "../components/BarChart";
import { AssetImage } from "../components/AssetImage";
import { ItemCard } from "../components/ItemCard";

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

  const gems = useMemo(() => getCurrencyEntry(account?.currencies, "gem"), [account]);
  const traitCrystal = useMemo(() => getCurrencyEntry(account?.currencies, "trait crystal"), [account]);

  // Currencies (Gems, Trait Crystal, ...) shown pinned at the top of the
  // inventory list instead of a separate currency section.
  const inventory = useMemo(() => {
    const currencies = Object.entries(account?.currencies ?? {}).map(
      ([name, c]) => [`currency:${name}`, { ...c, SubType: "Currency" }] as const,
    );
    const items = Object.entries(details.data?.inventory ?? {}).sort(
      ([, a], [, b]) => (b.Amount ?? 0) - (a.Amount ?? 0),
    );
    return [...currencies, ...items] as [
      string,
      { DisplayName?: string; Amount: number; SubType?: string; Rarity?: string; Icon?: string },
    ][];
  }, [account, details.data]);

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
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
        ← All accounts
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="gradient-purple flex size-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-[0_0_14px_rgba(129,19,255,0.4)]">
            {account.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold">{account.display_name || account.username}</h1>
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
            <div className="font-display text-3xl font-semibold tabular-nums">Lv {account.level ?? "?"}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {fmtFullNum(account.exp)} EXP
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <Tile
            label="Gems"
            value={fmtFullNum(gems?.Amount ?? 0)}
            icon={<AssetImage rbxAssetId={gems?.Icon} alt="Gems" className="size-5" fallback="💎" />}
          />
          <Tile
            label="Trait Crystal"
            value={fmtFullNum(traitCrystal?.Amount ?? 0)}
            icon={
              <AssetImage rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" className="size-5" fallback="🔮" />
            }
          />
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
      {account.in_match && account.progress?.Match && (
        <Section title="Live match state">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Map" value={account.progress.Match.MapName ?? "—"} />
            <Tile label="Act" value={account.progress.Match.ActName ?? "—"} />
            <Tile label="Difficulty" value={account.progress.Match.Difficulty ?? "—"} />
            <Tile
              label="Wave"
              value={
                account.progress.Match.Wave != null && account.progress.Match.MaxWave != null
                  ? `${account.progress.Match.Wave}/${account.progress.Match.MaxWave}`
                  : "—"
              }
            />
          </div>
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
            className="rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-fuchsia-400 dark:border-zinc-700"
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
                      className="cv-auto border-b border-zinc-100 last:border-0 dark:border-white/[0.04]"
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
                className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:border-zinc-700 dark:hover:border-fuchsia-500/30 dark:hover:bg-fuchsia-500/10"
              >
                Show more ({units.length - unitLimit} remaining)
              </button>
            )}
          </>
        )}
      </Section>

      {/* Inventory */}
      <Section title={`Inventory (${inventory.length})`}>
        {details.isLoading ? (
          <Empty>Loading…</Empty>
        ) : inventory.length === 0 ? (
          <Empty>No items.</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {inventory.map(([name, item]) => (
              <ItemCard
                key={name}
                name={item.DisplayName || name}
                amount={item.Amount}
                rarity={item.Rarity}
                icon={item.Icon}
                fallback="📦"
              />
            ))}
          </div>
        )}
      </Section>

      <BarChart title="Units by rarity" data={rarityDist} />

      {/* Raw stats */}
      {Object.keys(stats).length > 0 && (
        <Section title="Stats">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/[0.04]">
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

function Tile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-center dark:bg-white/[0.04]">
      <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="font-display flex items-center justify-center gap-1.5 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
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
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-zinc-400">{children}</p>;
}
