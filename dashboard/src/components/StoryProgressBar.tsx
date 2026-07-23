import { actToRoman } from "../lib/format";
import type { StoryProgress } from "../lib/types";

export function StoryProgressBar({
  story,
  label = "Story",
}: {
  story: StoryProgress | null | undefined;
  label?: string;
}) {
  if (!story || !story.TotalActs) {
    return <p className="text-sm text-zinc-400">No {label.toLowerCase()} progress data yet.</p>;
  }

  const percent = story.Percent ?? 0;

  if (story.Completed) {
    return (
      <div className="gradient-purple flex items-center justify-between rounded-xl p-4 text-white shadow-[0_0_16px_rgba(129,19,255,0.4)]">
        <div>
          <div className="font-display text-outline text-base font-semibold">{label} Completed! 🎉</div>
          <div className="text-xs text-white/85">
            All {story.TotalActs} acts cleared across every map.
          </div>
        </div>
      </div>
    );
  }

  const next = story.NextMap
    ? `${story.NextMap}${story.NextAct ? ` ${actToRoman(story.NextAct)}` : ""}`
    : null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span>
          {story.CompletedActs ?? 0} / {story.TotalActs} acts
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
        <div
          className="gradient-purple h-full rounded-full shadow-[0_0_8px_rgba(129,19,255,0.5)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {next && (
        <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Next: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{next}</span>
        </div>
      )}
    </div>
  );
}
