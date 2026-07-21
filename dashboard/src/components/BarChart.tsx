import { useMemo } from "react";

interface Props {
  data: { label: string; value: number; colorClass?: string }[];
  title: string;
}

/** Dependency-free SVG bar chart — keeps the bundle tiny vs. a chart library. */
export function BarChart({ data, title }: Props) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-zinc-500 dark:text-zinc-400">
              {d.label}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded ${d.colorClass ?? "bg-indigo-500"}`}
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-medium tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
