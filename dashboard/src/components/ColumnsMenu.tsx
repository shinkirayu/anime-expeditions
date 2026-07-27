import { useEffect, useRef, useState } from "react";
import { ALL_COLUMNS, COLUMN_LABELS, type ColumnKey, type ColumnPrefs } from "../lib/columnPrefs";

/** Checkbox popover controlling which optional dashboard columns/buttons are shown — same outside-click/Escape behavior as Dropdown. */
export function ColumnsMenu({ prefs, onChange }: { prefs: ColumnPrefs; onChange: (next: ColumnPrefs) => void }) {
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

  function toggle(key: ColumnKey) {
    onChange({ ...prefs, [key]: !prefs[key] });
  }

  const hiddenCount = ALL_COLUMNS.filter((k) => !prefs[k]).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Choose visible columns"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      >
        Columns{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ""}
        <svg viewBox="0 0 24 24" className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-fuchsia-500/15 dark:bg-[#1a1424]">
          {ALL_COLUMNS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                className="size-3.5 accent-fuchsia-500"
              />
              {COLUMN_LABELS[key]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
