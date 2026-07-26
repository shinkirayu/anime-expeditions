import { useState } from "react";
import { useToast } from "../Toast";
import { clearZeusXCreds, getZeusXAuthStatus, getZeusXCurrency, saveZeusXCreds } from "../../lib/zeusx";

/** Token-paste settings for ZeusX — no headless login exists (the desktop tool attaches to a real logged-in Chrome specifically to dodge reCAPTCHA/Cloudflare), so pasting a captured Bearer token is the only supported auth mode. */
export function ZeusXSettingsView({ onConnected }: { onConnected?: () => void }) {
  const [signedIn, setSignedIn] = useState(() => getZeusXAuthStatus().configured);
  const [tokenInput, setTokenInput] = useState("");
  const [currency, setCurrency] = useState(() => getZeusXCurrency());
  const toast = useToast();

  function save() {
    try {
      saveZeusXCreds(tokenInput, currency);
      setTokenInput("");
      setSignedIn(true);
      toast.success("ZeusX connected");
      onConnected?.();
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : String(err));
    }
  }

  function signOut() {
    clearZeusXCreds();
    setSignedIn(false);
    toast.info("Disconnected from ZeusX");
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display mb-1 text-sm font-semibold">Authentication</h3>
        <p className="mb-3 text-[11px] text-zinc-500 dark:text-zinc-400">
          Stored in this browser's localStorage only — never sent to Supabase.
        </p>

        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="font-semibold">Status:</span>
          {signedIn ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Not connected
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label className={labelCls}>Bearer Token</label>
          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste the Authorization: Bearer value here"
            spellCheck={false}
            rows={3}
            className={`${inputCls} font-mono text-xs`}
          />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Log into zeusx.com in your normal browser, open DevTools (F12) →{" "}
            <strong>Network</strong>, find any request to <code>api.zeusx.com</code>, and copy the{" "}
            <code>Authorization</code> header value (drop the leading "Bearer "). It's short-lived —
            repeat when publishing starts failing with an auth error.
          </p>

          <label className={labelCls}>Currency</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            className={`${inputCls} w-24`}
          />

          <div className="flex gap-2 pt-1">
            <button onClick={save} className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
              Save & Connect
            </button>
            {signedIn && (
              <button onClick={signOut} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700">
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
