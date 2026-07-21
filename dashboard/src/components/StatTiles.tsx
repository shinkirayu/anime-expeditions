import type { ComponentType } from "react";
import type { DashboardStats } from "../lib/types";
import { fmtFullNum } from "../lib/format";
import { PulseIcon, SwordIcon, UsersIcon } from "./icons";

const TILES: {
  key: keyof DashboardStats;
  label: string;
  icon: ComponentType<{ className?: string }>;
  chipClass: string;
}[] = [
  { key: "total", label: "Accounts", icon: UsersIcon, chipClass: "gradient-purple" },
  { key: "online", label: "Online", icon: PulseIcon, chipClass: "gradient-cyan" },
  {
    key: "in_match",
    label: "In match",
    icon: SwordIcon,
    chipClass: "bg-gradient-to-b from-[#ffb84d] to-[#ff7a1c]",
  },
];

export function StatTiles({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TILES.map(({ key, label, icon: Icon, chipClass }) => (
        <div
          key={key}
          className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]"
        >
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_0_10px_rgba(129,19,255,0.35)] ${chipClass}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="font-display text-xl font-semibold tracking-tight tabular-nums">
              {fmtFullNum(stats[key])}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
