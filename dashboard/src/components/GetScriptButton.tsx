import { useState } from "react";
import { useTrackerToken } from "../hooks/useTrackerToken";
import { GetScriptModal } from "./GetScriptModal";

/** Header button: opens the tracker script modal (install steps, copy, token rotation). */
export function GetScriptButton() {
  const { isLoading } = useTrackerToken();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="rounded-full px-3.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
      >
        Get script
      </button>
      {open && <GetScriptModal onClose={() => setOpen(false)} />}
    </>
  );
}
