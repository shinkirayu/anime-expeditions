/** Circular red gradient close button, matching the game's own dialog close style. */
export function CloseButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
