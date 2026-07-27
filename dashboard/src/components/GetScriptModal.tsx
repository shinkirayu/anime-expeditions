import { useEffect } from "react";
import { useRegenerateTrackerToken, useTrackerToken } from "../hooks/useTrackerToken";
import { buildTrackerScript } from "../lib/trackerScript";
import { useToast } from "./Toast";
import { CloseButton } from "./CloseButton";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function GetScriptModal({ onClose }: { onClose: () => void }) {
  const { data: token, isLoading } = useTrackerToken();
  const regenerate = useRegenerateTrackerToken();
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyScript() {
    if (!token) return;
    const endpoint = `${PROJECT_URL}/functions/v1/ingest?key=${token}`;
    await navigator.clipboard.writeText(buildTrackerScript(endpoint));
    toast.success("Script copied", "Keep it private — it embeds a personal token tied to your account.");
  }

  function regenerateToken() {
    const ok = window.confirm(
      "Regenerate your tracker token?\n\nAny script already running with the old token (on this or any other account) will stop reporting until you copy and re-paste the new script.",
    );
    if (!ok) return;
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Token regenerated", "Copy the script again to pick up the new token."),
      onError: (err) => toast.error("Couldn't regenerate token", (err as Error).message),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <h2 className="font-display font-semibold">Get tracker script</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="space-y-4 p-4 text-sm">
          <ol className="list-decimal space-y-1.5 pl-4 text-zinc-600 dark:text-zinc-300">
            <li>Copy the script below.</li>
            <li>Paste it into your Roblox executor while Anime Expeditions is open, then run it.</li>
            <li>Same script works for every account — copy once, run it in each game window.</li>
          </ol>

          <button
            onClick={copyScript}
            disabled={isLoading || !token}
            className="font-display gradient-purple w-full rounded-full py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Copy script"}
          </button>

          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            The script embeds a personal token tied to your account — anyone with it can post data
            attributed to you. Don't share it or paste it into public tool configs.
          </p>

          <div className="border-t border-zinc-200 pt-3 dark:border-white/10">
            <button
              onClick={regenerateToken}
              disabled={regenerate.isPending}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              {regenerate.isPending ? "Regenerating…" : "Token leaked? Regenerate it"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
