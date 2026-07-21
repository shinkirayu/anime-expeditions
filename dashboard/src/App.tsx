import { Suspense, lazy } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { supabase } from "./lib/supabase";
import { useSession } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeToggle } from "./components/ThemeToggle";
import { SkeletonGrid } from "./components/Skeletons";

// Route-level code splitting: the detail page ships in its own chunk.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SetupPage = lazy(() => import("./pages/SetupPage"));

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold tracking-tight">
          <span className="text-indigo-600 dark:text-indigo-400">AE</span> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/setup"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Get script
          </Link>
          <ThemeToggle />
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function Gate() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <SkeletonGrid count={6} />
      </div>
    );
  }
  if (!session) {
    return (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    );
  }
  return (
    <Shell>
      <Suspense fallback={<SkeletonGrid count={6} />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/account/:userId" element={<AccountPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </Shell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
