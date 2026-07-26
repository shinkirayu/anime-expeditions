import type { ActProgress } from "../lib/types";

/** Per-act unlock pills — Villain Invasion's 4th act is internally named "Crow", shown as "Act 4 (Crow)". */
export function VillainInvasionActs({ acts }: { acts: ActProgress[] | null | undefined }) {
  if (!acts || acts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {acts.map((act, i) => {
        const label = /^Act \d+$/.test(act.Name) ? act.Name : `Act ${i + 1} (${act.Name})`;
        const state = act.Completed ? "completed" : act.Unlocked ? "unlocked" : "locked";
        return (
          <span
            key={act.Name}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              state === "completed"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : state === "unlocked"
                  ? "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"
                  : "bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500"
            }`}
          >
            {state === "completed" ? "✓ " : state === "locked" ? "🔒 " : ""}
            {label}
          </span>
        );
      })}
    </div>
  );
}
