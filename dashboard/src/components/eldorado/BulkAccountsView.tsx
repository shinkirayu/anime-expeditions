import { useMemo, useState } from "react";
import { useToast } from "../Toast";
import { EldoradoListingModal } from "../EldoradoListingModal";
import { BulkAutoListModal } from "./BulkAutoListModal";
import { useAccountByUsername, useAccountDetails } from "../../hooks/useAccountDetail";
import { buildDefaultDescription, buildDefaultTitle } from "../../lib/eldoradoDescribe";
import {
  clearBulkAccounts,
  getBulkAccounts,
  importBulkAccounts,
  removeBulkAccounts,
  setBulkAccountsUsed,
} from "../../lib/eldorado";
import type { BulkAccount } from "../../lib/eldoradoTypes";

/** Port of eldorado/src/renderer/src/pages/BulkAccounts.tsx — the credential pool used to fill Automatic-delivery listings. */
export function BulkAccountsView() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<BulkAccount[]>(() => getBulkAccounts());
  const [paste, setPaste] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [listingUsernames, setListingUsernames] = useState<string[]>([]);
  const [eldoradoOpen, setEldoradoOpen] = useState(false);

  // When listing a single bulk account, try to match it to a tracked dashboard
  // account by username so the showcase auto-fetch ("Quick fetch all 3" /
  // "Use account showcase") works here too, same as the Units tab.
  const soloListingUsername = listingUsernames.length === 1 ? listingUsernames[0] : null;
  const soloAccount = useAccountByUsername(soloListingUsername);
  const soloDetails = useAccountDetails(soloAccount.data?.user_id ?? null);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? accounts.filter((a) => a.user.toLowerCase().includes(q)) : accounts;
  }, [accounts, filter]);

  const available = accounts.filter((a) => !a.used).length;

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllVisible(): void {
    setSelected((prev) => {
      const allSelected = visible.every((a) => prev.has(a.id));
      const next = new Set(prev);
      visible.forEach((a) => (allSelected ? next.delete(a.id) : next.add(a.id)));
      return next;
    });
  }

  function importPaste(): void {
    if (!paste.trim()) return toast.error("Paste some accounts first");
    const res = importBulkAccounts(paste);
    setAccounts(res.accounts);
    setPaste("");
    toast.success(`Imported ${res.added} account(s)`, res.skipped ? `${res.skipped} skipped (duplicate or malformed)` : undefined);
  }

  function mark(used: boolean): void {
    if (selected.size === 0) return;
    setAccounts(setBulkAccountsUsed([...selected], used));
    setSelected(new Set());
    toast.info(used ? "Marked as used" : "Marked as available");
  }

  function removeSelected(): void {
    if (selected.size === 0) return;
    setAccounts(removeBulkAccounts([...selected]));
    setSelected(new Set());
    toast.info("Removed");
  }

  function clearAll(): void {
    setAccounts(clearBulkAccounts());
    setSelected(new Set());
    toast.info("Cleared all accounts");
  }

  /** Lists 2+ (or just 1) selected credentials on Eldorado as one Automatic-delivery offer. */
  function listSelected(): void {
    if (selected.size === 0) return;
    const chosen = accounts.filter((a) => selected.has(a.id));
    setAccounts(setBulkAccountsUsed([...selected], true));
    setListingUsernames(chosen.map((a) => a.user));
    setSelected(new Set());
    setEldoradoOpen(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Your credential pool, stored in this browser's localStorage. Paste <code>user:pass</code>{" "}
        lines, then pick from this pool when building a listing.
      </p>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display mb-1 text-sm font-semibold">Import</h3>
        <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          One per line, e.g. <code>myuser:mypassword</code>. Passwords may contain colons (only the
          first colon splits). Blank lines and <code>#</code> comments are ignored; duplicate
          usernames are skipped.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={"user1:pass1\nuser2:pass2\nuser3:pass3"}
          spellCheck={false}
          rows={5}
          className="w-full rounded-lg border border-zinc-200 bg-transparent p-2 font-mono text-xs outline-none focus:border-fuchsia-400 dark:border-zinc-700"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={importPaste}
            className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          >
            Import
          </button>
          <button
            onClick={() => setPaste("")}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
          >
            Clear box
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 p-3 dark:border-white/10">
          <div className="flex gap-1.5 text-[11px] font-semibold">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {available} available
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {accounts.length - available} used
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {accounts.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search user…"
              className="w-36 rounded-lg border border-zinc-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-fuchsia-400 dark:border-zinc-700"
            />
            <label className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="accent-fuchsia-500"
              />
              Show passwords
            </label>
          </div>
        </div>

        {accounts.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No accounts yet — paste some above.</p>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-[#150f22]">
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={visible.length > 0 && visible.every((a) => selected.has(a.id))}
                        onChange={toggleAllVisible}
                        className="accent-fuchsia-500"
                      />
                    </th>
                    <th className="px-2 py-2 font-medium">User</th>
                    <th className="px-2 py-2 font-medium">Password</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((a) => (
                    <tr key={a.id} className="border-b border-zinc-100 last:border-0 dark:border-white/5">
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggle(a.id)}
                          className="accent-fuchsia-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-mono">{a.user}</td>
                      <td className="px-2 py-1.5 font-mono">{showPasswords ? a.pass : "••••••••"}</td>
                      <td className="px-2 py-1.5">
                        {a.used ? (
                          <span className="text-zinc-400">Used</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 p-3 dark:border-white/10">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{selected.size} selected</span>
              <button
                onClick={listSelected}
                disabled={!selected.size}
                className="gradient-purple rounded-lg px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selected.size > 1 ? `Bulk list on Eldorado (${selected.size})` : "List on Eldorado"}
              </button>
              <button
                onClick={() => mark(false)}
                disabled={!selected.size}
                className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium disabled:opacity-40 dark:border-zinc-700"
              >
                Mark available
              </button>
              <button
                onClick={() => mark(true)}
                disabled={!selected.size}
                className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium disabled:opacity-40 dark:border-zinc-700"
              >
                Mark used
              </button>
              <button
                onClick={removeSelected}
                disabled={!selected.size}
                className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
              >
                Remove
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium dark:border-zinc-700"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      {eldoradoOpen && listingUsernames.length > 1 && (
        <BulkAutoListModal usernames={listingUsernames} onClose={() => setEldoradoOpen(false)} />
      )}

      {eldoradoOpen && listingUsernames.length <= 1 && (
        <EldoradoListingModal
          initialTitle={soloAccount.data ? buildDefaultTitle(soloAccount.data) : `Bulk accounts — ${listingUsernames.length} account(s)`}
          initialDescription={
            soloAccount.data
              ? buildDefaultDescription(soloAccount.data, soloDetails.data)
              : `${listingUsernames.length} account credentials from the Bulk Accounts pool.`
          }
          initialAccountUsernames={listingUsernames}
          showcaseAccount={soloAccount.data ? { account: soloAccount.data, details: soloDetails.data } : undefined}
          onClose={() => setEldoradoOpen(false)}
        />
      )}
    </div>
  );
}
