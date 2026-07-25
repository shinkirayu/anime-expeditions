import { useEffect, useRef, useState } from "react";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Custom-styled dropdown replacing native <select>. Native <option> popups
 * are rendered by the OS/browser with their own colors that ignore page CSS
 * (including our dark theme), which made the sort menu unreadable
 * (light text on a light popup). This is fully styled by us instead.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  fullWidth,
  placeholder,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  label: string;
  ariaLabel: string;
  /** Renders as a full-width form field ("Select a game…") instead of the compact "Label: value" chip. */
  fullWidth?: boolean;
  /** Shown when `value` doesn't match any option (fullWidth mode only). */
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${fullWidth ? "w-full" : ""}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={
          fullWidth
            ? "flex w-full items-center justify-between gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 text-left text-sm text-zinc-900 outline-none focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            : "flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
        }
      >
        {fullWidth ? (
          <span className={current ? "" : "text-zinc-400 dark:text-zinc-500"}>{current?.label ?? placeholder ?? ""}</span>
        ) : (
          <>{label}: {current?.label ?? ""}</>
        )}
        <svg viewBox="0 0 24 24" className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 max-h-64 min-w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-fuchsia-500/15 dark:bg-[#1a1424] ${
            fullWidth ? "left-0" : "right-0"
          }`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs whitespace-nowrap transition-colors ${
                o.value === value
                  ? "bg-fuchsia-50 font-semibold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
