import { Suspense, lazy } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
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
const UnitsPage = lazy(() => import("./pages/UnitsPage"));

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3 sm:px-6">
          <Link to="/" className="mr-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              AE
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Dashboard</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/">Accounts</NavItem>
            <NavItem to="/units">Units</NavItem>
            <NavItem to="/setup">Get script</NavItem>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
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
          <Route path="/units" element={<UnitsPage />} />
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
