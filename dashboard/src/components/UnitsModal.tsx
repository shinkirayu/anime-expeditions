import { useEffect, useMemo } from "react";
import { useAccountDetails } from "../hooks/useAccountDetail";
import { fmtNum, rarityClass } from "../lib/format";
import type { AccountListRow, UnitEntry } from "../lib/types";

export function UnitsModal({ account, onClose }: { account: AccountListRow; onClose: () => void }) {
  const details = useAccountDetails(account.user_id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const units = useMemo(() => {
    const all = (details.data?.units ?? []) as UnitEntry[];
    return all
      .slice()
      .sort((a, b) => (b.Level ?? 0) - (a.Level ?? 0) || Number(!!b.Equipped) - Number(!!a.Equipped));
  }, [details.data]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <div>
            <h2 className="font-display font-semibold">{account.display_name || account.username}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              @{account.username} · Units ({units.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {details.isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
          ) : units.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">No units.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-fuchsia-500/10 dark:text-zinc-400">
                  <th className="py-1.5 pr-3 font-medium">Unit</th>
                  <th className="py-1.5 pr-3 font-medium">Rarity</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Level</th>
                  <th className="py-1.5 font-medium">Equipped</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.UniqueId} className="border-b border-zinc-100 last:border-0 dark:border-white/[0.04]">
                    <td className="py-1.5 pr-3 font-medium">{u.DisplayName || u.Asset}</td>
                    <td className={`py-1.5 pr-3 ${rarityClass(u.Rarity)}`}>{u.Rarity ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtNum(u.Level)}</td>
                    <td className="py-1.5">{u.Equipped ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
