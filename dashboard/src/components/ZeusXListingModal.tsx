import { useState } from "react";
import { Link } from "react-router-dom";
import { getZeusXAuthStatus } from "../lib/zeusx";
import { NewZeusXListingView } from "./zeusx/NewZeusXListingView";
import { CloseButton } from "./CloseButton";
import type { AccountDetailsRow, AccountRow } from "../lib/types";

interface Props {
  onClose: () => void;
  initialTitle?: string;
  initialDescription?: string;
  showcaseAccount?: { account: AccountRow; details: AccountDetailsRow | null | undefined };
  /** Accounts this listing represents — marked "listed" (Units tab tag) once publish succeeds. */
  listingUserIds?: number[];
}

/** Quick "list this on ZeusX" surface — mirrors EldoradoListingModal. Token setup lives on /zeusx. */
export function ZeusXListingModal({ onClose, initialTitle, initialDescription, showcaseAccount, listingUserIds }: Props) {
  const [signedIn, setSignedIn] = useState(() => getZeusXAuthStatus().configured);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <h2 className="font-display font-semibold">List on ZeusX</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="overflow-y-auto p-4">
          {signedIn ? (
            <NewZeusXListingView
              initialTitle={initialTitle}
              initialDescription={initialDescription}
              showcaseAccount={showcaseAccount}
              listingUserIds={listingUserIds}
            />
          ) : (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-6 text-center dark:border-white/10">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Connect your ZeusX Bearer token before creating a listing.</p>
              <Link to="/zeusx" onClick={onClose} className="gradient-purple inline-block rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
                Open ZeusX Settings
              </Link>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Already connected in another tab?{" "}
                <button onClick={() => setSignedIn(getZeusXAuthStatus().configured)} className="font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
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
