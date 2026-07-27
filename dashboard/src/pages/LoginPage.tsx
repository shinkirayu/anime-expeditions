import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

/**
 * Sign-in only — accounts are provisioned manually in Supabase Auth and RLS
 * blocks reads for anyone not provisioned, so a self-serve "create account"
 * flow would look like it worked and then land on a permanently empty
 * dashboard with no explanation. Don't offer that dead end.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 p-4 dark:bg-[#0d0a14]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-fuchsia-500/10 dark:bg-white/[0.03]"
      >
        <h1 className="text-outline font-display mb-1 text-xl font-semibold">AE Dashboard</h1>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">Sign in to view your tracked accounts</p>
        <label className="mb-1 block text-xs font-semibold">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700"
        />
        <label className="mb-1 block text-xs font-semibold">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="mb-4 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700"
        />
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="font-display gradient-purple w-full rounded-full py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.4)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Accounts are provisioned manually — contact an admin for access.
        </p>
      </form>
    </div>
  );
}
