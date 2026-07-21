import type { ComponentType } from "react";
import type { DashboardStats } from "../lib/types";
import { fmtFullNum } from "../lib/format";
import { PulseIcon, SwordIcon, UsersIcon } from "./icons";

const TILES: {
  key: keyof DashboardStats;
  label: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    key: "total",
    label: "Accounts",
    icon: UsersIcon,
    accent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    key: "online",
    label: "Online",
    icon: PulseIcon,
    accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    key: "in_match",
    label: "In match",
    icon: SwordIcon,
    accent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
];

export function StatTiles({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TILES.map(({ key, label, icon: Icon, accent }) => (
        <div
          key={key}
          className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="text-xl font-bold tracking-tight tabular-nums">{fmtFullNum(stats[key])}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
