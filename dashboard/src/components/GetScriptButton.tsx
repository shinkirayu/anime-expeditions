import { useTrackerToken } from "../hooks/useTrackerToken";
import { buildTrackerScript } from "../lib/trackerScript";
import { useToast } from "./Toast";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;

/** Header button: copies the user's personal tracker script straight to the clipboard. */
export function GetScriptButton() {
  const { data: token, isLoading } = useTrackerToken();
  const toast = useToast();

  async function copyScript() {
    if (!token) return;
    const endpoint = `${PROJECT_URL}/functions/v1/ingest?key=${token}`;
    await navigator.clipboard.writeText(buildTrackerScript(endpoint));
    toast.success("Script copied", "Keep it private — it embeds a personal token tied to your account.");
  }

  return (
    <button
      onClick={copyScript}
      disabled={isLoading || !token}
      className="rounded-full px-3.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      Get script
    </button>
  );
}
