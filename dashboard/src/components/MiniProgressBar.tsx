/** Compact story-progress indicator for dense table rows. */
export function MiniProgressBar({ percent, completed }: { percent?: number; completed?: boolean }) {
  if (completed) {
    return (
      <span className="font-display text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-400">
        100% ✓
      </span>
    );
  }

  const p = Math.min(100, Math.max(0, percent ?? 0));

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
        <div className="gradient-purple h-full rounded-full" style={{ width: `${p}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{p}%</span>
    </div>
  );
}
