import type { DashboardStats } from "../lib/types";
import { fmtFullNum } from "../lib/format";

const TILES: { key: keyof DashboardStats; label: string }[] = [
  { key: "total", label: "Accounts" },
  { key: "online", label: "Online" },
  { key: "in_match", label: "In match" },
  { key: "avg_level", label: "Avg level" },
];

export function StatTiles({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {key === "avg_level" ? stats[key] : fmtFullNum(stats[key])}
          </div>
        </div>
      ))}
    </div>
  );
}
