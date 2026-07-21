import { useEffect, useMemo } from "react";
import { useAccountDetails } from "../hooks/useAccountDetail";
import type { AccountListRow } from "../lib/types";
import { ItemCard } from "./ItemCard";
import { CloseButton } from "./CloseButton";

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

  // Currencies (Gems, Trait Crystal, ...) shown pinned at the top instead of
  // a separate section, followed by the regular inventory items.
  const tiles = useMemo(() => {
    const currencies = Object.entries(account.currencies ?? {}).map(([name, c]) => ({
      key: `currency:${name}`,
      name: c.DisplayName || name,
      amount: c.Amount,
      rarity: c.Rarity,
      icon: c.Icon,
    }));
    const items = Object.entries(details.data?.inventory ?? {})
      .sort(([, a], [, b]) => (b.Amount ?? 0) - (a.Amount ?? 0))
      .map(([name, item]) => ({
        key: `item:${name}`,
        name: item.DisplayName || name,
        amount: item.Amount,
        rarity: item.Rarity,
        icon: item.Icon,
      }));
    return [...currencies, ...items];
  }, [account.currencies, details.data]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <h2 className="font-display font-semibold">{account.display_name || account.username}</h2>
          <CloseButton onClick={onClose} />
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {details.isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {tiles.map((t) => (
                <ItemCard key={t.key} name={t.name} amount={t.amount} rarity={t.rarity} icon={t.icon} fallback="📦" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
