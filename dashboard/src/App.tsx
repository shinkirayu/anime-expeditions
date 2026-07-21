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
        `font-display rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? "gradient-purple text-white shadow-[0_0_12px_rgba(129,19,255,0.5)]"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
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
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-fuchsia-500/10 dark:bg-[#0d0a14]/85">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-3 sm:px-6">
          <Link to="/" className="mr-2 flex items-center gap-2">
            <span className="gradient-purple font-display flex size-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-[0_0_14px_rgba(129,19,255,0.55)]">
              AE
            </span>
            <span className="font-display hidden text-sm font-semibold tracking-tight sm:inline">
              Dashboard
            </span>
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
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
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
