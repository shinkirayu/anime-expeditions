import { useEffect, useMemo } from "react";
import { useAccountDetails } from "../hooks/useAccountDetail";
import { fmtNum, rarityClass } from "../lib/format";
import type { AccountListRow, UnitEntry } from "../lib/types";
import { CloseButton } from "./CloseButton";

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
          <h2 className="font-display font-semibold">{account.display_name || account.username}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {details.isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
          ) : units.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">No units.</p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-fuchsia-500/10 dark:text-zinc-400">
                  <th className="px-2 py-2 font-medium">Unit</th>
                  <th className="px-2 py-2 text-center font-medium">Rarity</th>
                  <th className="px-2 py-2 text-center font-medium">Trait</th>
                  <th className="px-2 py-2 text-center font-medium">Level</th>
                  <th className="px-2 py-2 text-center font-medium">Equipped</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.UniqueId} className="border-b border-zinc-100 last:border-0 dark:border-white/[0.04]">
                    <td className="truncate px-2 py-2 font-medium">{u.DisplayName || u.Asset}</td>
                    <td className={`px-2 py-2 text-center ${rarityClass(u.Rarity)}`}>{u.Rarity ?? "—"}</td>
                    <td className={`truncate px-2 py-2 text-center ${rarityClass(u.Trait?.Rarity)}`}>
                      {u.Trait?.DisplayName ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums">{fmtNum(u.Level)}</td>
                    <td className="px-2 py-2 text-center">{u.Equipped ? "✓" : ""}</td>
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
