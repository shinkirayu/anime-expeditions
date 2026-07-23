/** Minimal line-art icons (stroke = currentColor) — no emoji, no icon library. Size via className (e.g. "size-4"). */

interface IconProps {
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SwordIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="19" y1="5" x2="9" y2="15" />
      <line x1="7" y1="13" x2="11" y2="17" />
      <line x1="9" y1="15" x2="5" y2="19" />
    </svg>
  );
}

export function StarIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5l2.86 6.24 6.64.66-5.04 4.62 1.46 6.98L12 17.77l-5.92 3.23 1.46-6.98-5.04-4.62 6.64-.66z" />
    </svg>
  );
}

export function BackpackIcon({ className = "size-3.5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 8V6a5 5 0 0 1 10 0v2" />
      <rect x="5" y="8" width="14" height="13" rx="2" />
      <path d="M9 8v3a3 3 0 0 0 6 0V8" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

export function UsersIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2c2.5.4 4.5 2.6 4.5 5.3" />
    </svg>
  );
}

export function PulseIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}

export function ChevronIcon({ className = "size-3.5", open = false }: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base}
      className={`${className} transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}
