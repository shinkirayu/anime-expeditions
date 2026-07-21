import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else if (!data.session) {
        // Email confirmation is required before a session is issued.
        setNotice("Account created — check your email to confirm, then sign in.");
        setMode("signin");
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="mb-1 text-xl font-bold">AE Dashboard</h1>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          {mode === "signin" ? "Sign in to view your tracked accounts" : "Create an account to start tracking"}
        </p>
        <label className="mb-1 block text-xs font-medium">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
        />
        <label className="mb-1 block text-xs font-medium">Password</label>
        <input
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="mb-4 w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
        />
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
