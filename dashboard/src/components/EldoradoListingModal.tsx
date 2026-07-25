import { useState } from "react";
import { Link } from "react-router-dom";
import { getAuthState } from "../lib/eldorado";
import { NewListingView } from "./eldorado/NewListingView";
import { CloseButton } from "./CloseButton";
import type { AccountDetailsRow, AccountRow } from "../lib/types";

interface Props {
  onClose: () => void;
  initialTitle?: string;
  initialDescription?: string;
  /** Pre-seeds Automatic delivery with one blob per entry (e.g. accounts selected on the Units tab). */
  initialAccounts?: string[];
  /** When set, auto-renders that account's showcase image and attaches it as the listing's main photo. */
  showcaseAccount?: { account: AccountRow; details: AccountDetailsRow | null | undefined };
}

/**
 * Quick "list this account on Eldorado" surface — just the listing form
 * (offer details, template picker, photo drop zone, delivery/account info).
 * Session/User-Agent setup, saved templates management, the batch queue, and
 * the bulk credential pool are full features of their own now, on the
 * dedicated /eldorado page — this modal only links out to them.
 */
export function EldoradoListingModal({ onClose, initialTitle, initialDescription, initialAccounts, showcaseAccount }: Props) {
  const [signedIn, setSignedIn] = useState(() => getAuthState().signedIn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <h2 className="font-display font-semibold">List on Eldorado</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="overflow-y-auto p-4">
          {signedIn ? (
            <NewListingView
              initialTitle={initialTitle}
              initialDescription={initialDescription}
              initialAccounts={initialAccounts}
              showcaseAccount={showcaseAccount}
            />
          ) : (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-6 text-center dark:border-white/10">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Connect your Eldorado seller session before creating a listing.
              </p>
              <Link
                to="/eldorado"
                onClick={onClose}
                className="gradient-purple inline-block rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              >
                Open Eldorado Settings
              </Link>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Already connected in another tab?{" "}
                <button onClick={() => setSignedIn(getAuthState().signedIn)} className="font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
                  Refresh
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
