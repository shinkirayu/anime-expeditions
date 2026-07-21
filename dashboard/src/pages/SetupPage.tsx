import { useState } from "react";
import { useTrackerToken } from "../hooks/useTrackerToken";
import { buildTrackerScript } from "../lib/trackerScript";
import { supabase } from "../lib/supabase";

const PROJECT_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function SetupPage() {
  const { data: token, isLoading, error } = useTrackerToken();
  const [copied, setCopied] = useState(false);

  const endpoint = token ? `${PROJECT_URL}/functions/v1/ingest?key=${token}` : "";
  const script = token ? buildTrackerScript(endpoint) : "";

  async function copyScript() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadScript() {
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AnimeExpeditionsTracker.lua";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-lg font-semibold">Get your tracker script</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This copy is tied to your account only. Only accounts you run it against will show up on
          your dashboard — nobody else can see them, and you won't see anyone else's.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Keep this script private. It embeds a personal token — anyone who has it can post data
        that shows up as tracked under your account.
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Generating your token…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">Failed to load your token.</p>}

      {token && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyScript}
              className="font-display gradient-purple rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.4)] transition-opacity hover:opacity-90"
            >
              {copied ? "Copied!" : "Copy script"}
            </button>
            <button
              onClick={downloadScript}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-white/5"
            >
              Download .lua
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="ml-auto rounded-full border border-zinc-200 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-white/5"
            >
              Sign out
            </button>
          </div>

          <pre className="max-h-[60vh] overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-fuchsia-500/10 dark:bg-black/30">
            <code>{script}</code>
          </pre>
        </>
      )}
    </div>
  );
}
