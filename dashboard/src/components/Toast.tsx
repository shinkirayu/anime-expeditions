import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastEntry {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  notify: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  info: "border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-[#150f22] dark:text-zinc-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, kind, title, message }]);
      const ttl = kind === "error" ? 8000 : 4500;
      setTimeout(() => remove(id), ttl);
    },
    [remove],
  );

  const api: ToastApi = {
    notify,
    success: (t, m) => notify("success", t, m),
    error: (t, m) => notify("error", t, m),
    info: (t, m) => notify("info", t, m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto w-full max-w-sm cursor-pointer rounded-xl border p-3 text-sm shadow-lg ${KIND_STYLES[t.kind]}`}
          >
            <div className="font-semibold">{t.title}</div>
            {t.message && <div className="mt-0.5 text-xs opacity-80">{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
