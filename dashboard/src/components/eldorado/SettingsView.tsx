import { useEffect, useState } from "react";
import { useToast } from "../Toast";
import {
  getAuthState,
  getStoredUserAgent,
  saveToken,
  savePassword,
  saveUserAgent,
  setAuthMode as setAuthModeStorage,
  signOut,
  testConnection,
} from "../../lib/eldorado";
import type { AuthMode, EldoradoAuthState } from "../../lib/eldoradoTypes";

/** Port of eldorado/src/renderer/src/pages/Settings.tsx. */

function expiryLabel(exp: number | null): string {
  if (!exp) return "";
  const secs = exp - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "expired";
  const m = Math.floor(secs / 60);
  if (m < 60) return `expires in ${m}m`;
  return `expires in ${Math.floor(m / 60)}h ${m % 60}m`;
}

export function SettingsView({ onConnected }: { onConnected?: () => void }) {
  const toast = useToast();

  const [state, setState] = useState<EldoradoAuthState>(() => getAuthState());
  const [userAgent, setUserAgentInput] = useState(() => getStoredUserAgent());

  const [tokenInput, setTokenInput] = useState("");
  const [emailInput, setEmailInput] = useState(() => getAuthState().email);
  const [passwordInput, setPasswordInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setEmailInput((prev) => prev || state.email);
  }, [state.email]);

  function saveConnection(): void {
    saveUserAgent(userAgent);
    toast.success("Connection settings saved");
  }

  function switchMode(mode: AuthMode): void {
    setState(setAuthModeStorage(mode));
  }

  async function handleSaveToken(): Promise<void> {
    if (!tokenInput.trim()) return toast.error("Paste your token first");
    setBusy(true);
    try {
      const next = saveToken(tokenInput.trim());
      setState(next);
      setTokenInput("");
      toast.success("Token saved", next.email);
      onConnected?.();
    } catch (err) {
      toast.error("Token rejected", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePassword(): Promise<void> {
    if (!emailInput.trim() || !passwordInput) return toast.error("Enter email and password");
    setBusy(true);
    try {
      const next = await savePassword(emailInput.trim(), passwordInput);
      setState(next);
      setPasswordInput("");
      toast.success("Credentials verified and saved");
      onConnected?.();
    } catch (err) {
      toast.error("Sign-in failed", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut(): void {
    setState(signOut());
    toast.info("Signed out");
  }

  async function handleTestConnection(): Promise<void> {
    setTesting(true);
    try {
      const msg = await testConnection();
      toast.success("Connection successful", msg);
    } catch (err) {
      toast.error("Connection failed", err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";
  const hintCls = "text-[11px] text-zinc-500 dark:text-zinc-400";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display mb-1 text-sm font-semibold">Authentication</h3>
        <p className={`mb-3 ${hintCls}`}>
          Choose how you sign in. Secrets are stored in this browser's localStorage only (see the
          note in Eldorado Settings) — never sent to Supabase.
        </p>

        <div className="mb-3 flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
          <button
            onClick={() => switchMode("token")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              state.authMode === "token" ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Session Token
          </button>
          <button
            onClick={() => switchMode("password")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
              state.authMode === "password" ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Email + Password
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="font-semibold">Status:</span>
          {state.signedIn ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Active{state.email ? ` — ${state.email}` : ""}
              {state.authMode === "token" && state.tokenExpiresAt ? ` (${expiryLabel(state.tokenExpiresAt)})` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Not authenticated
            </span>
          )}
        </div>

        {state.authMode === "token" ? (
          <div className="space-y-2">
            <label className={labelCls}>Session Token (IdToken)</label>
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste the __Host-EldoradoIdToken value here"
              spellCheck={false}
              rows={3}
              className={`${inputCls} font-mono text-xs`}
            />
            <p className={hintCls}>
              Log into eldorado.gg in your normal browser, open DevTools (F12) →{" "}
              <strong>Application ▸ Cookies ▸ https://www.eldorado.gg</strong>, copy the value of{" "}
              <code>__Host-EldoradoIdToken</code>, and paste it above. It expires ~hourly.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSaveToken}
                disabled={busy}
                className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save Token
              </button>
              {state.signedIn && (
                <button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className={labelCls}>Account Email</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="seller@example.com"
              autoComplete="off"
              className={inputCls}
            />
            <label className={labelCls}>Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder={state.signedIn ? "•••••••• (saved — leave blank to keep)" : "Account password"}
              autoComplete="off"
              className={inputCls}
            />
            <p className={hintCls}>
              Headless sign-in straight to AWS Cognito — no browser, no Cloudflare. Requires an
              email+password credential on your account (ask api@eldorado.gg if you only use Google).
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSavePassword}
                disabled={busy}
                className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save & Verify
              </button>
              {state.signedIn && (
                <button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display mb-1 text-sm font-semibold">Connection</h3>
        <p className={`mb-3 ${hintCls}`}>Normally you only need to set the User-Agent.</p>

        <div className="space-y-2">
          <label className={labelCls}>User-Agent</label>
          <input
            type="text"
            value={userAgent}
            onChange={(e) => setUserAgentInput(e.target.value)}
            placeholder="Your assigned seller-bot User-Agent"
            className={inputCls}
          />
          <p className={hintCls}>
            The unique User-Agent Eldorado assigned to your seller bot. Required for authorized API
            access.
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={saveConnection}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
          >
            Save
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {testing ? "Testing…" : "Test Connection"}
          </button>
        </div>
      </div>
    </div>
  );
}
