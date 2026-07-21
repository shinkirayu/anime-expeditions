import { useEffect, useMemo } from "react";
import { useAccountDetails } from "../hooks/useAccountDetail";
import { getGemsAmount, fmtFullNum, rarityClass } from "../lib/format";
import type { AccountListRow } from "../lib/types";

export function InventoryModal({
  account,
  onClose,
}: {
  account: AccountListRow;
  onClose: () => void;
}) {
  const details = useAccountDetails(account.user_id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Gems shown as the first inventory row instead of a separate currency section.
  const rows = useMemo(() => {
    const gems = getGemsAmount(account.currencies);
    const items = Object.entries(details.data?.inventory ?? {}).sort(
      ([, a], [, b]) => (b.Amount ?? 0) - (a.Amount ?? 0),
    );
    return [
      { key: "__gems", name: "Gems", amount: gems, rarity: undefined as string | undefined, subType: "Currency" },
      ...items.map(([name, item]) => ({
        key: name,
        name: item.DisplayName || name,
        amount: item.Amount,
        rarity: item.Rarity,
        subType: item.SubType,
      })),
    ];
  }, [account.currencies, details.data]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold">{account.display_name || account.username}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">@{account.username} · Inventory</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          {details.isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
          ) : (
            <div className="space-y-1">
              {rows.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/60"
                >
                  <span className={`truncate ${rarityClass(r.rarity)}`}>
                    {r.key === "__gems" && "💎 "}
                    {r.name}
                    {r.subType && r.key !== "__gems" && (
                      <span className="ml-2 text-[10px] text-zinc-400">{r.subType}</span>
                    )}
                  </span>
                  <span className="ml-3 shrink-0 font-semibold tabular-nums">×{fmtFullNum(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
