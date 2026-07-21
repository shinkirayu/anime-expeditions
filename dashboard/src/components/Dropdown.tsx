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
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  label: string;
  ariaLabel: string;
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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      >
        {label}: {current?.label ?? ""}
        <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-full overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-fuchsia-500/15 dark:bg-[#1a1424]">
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
