import { actToRoman } from "../lib/format";
import type { StoryProgress } from "../lib/types";

/** Shows the current/highest unlocked stage as a Roman numeral (I, II, III...) instead of a percent. */
export function StageBadge({ story }: { story: StoryProgress | null | undefined }) {
  if (!story || !story.TotalActs) {
    return <span className="text-xs text-zinc-400">—</span>;
  }

  if (story.Completed) {
    return (
      <span className="font-display text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">
        {actToRoman(String(story.TotalActs))} ✓
      </span>
    );
  }

  return (
    <span className="font-display text-xs font-bold text-zinc-700 dark:text-zinc-200">
      {actToRoman(story.NextAct) ?? "—"}
    </span>
  );
}
