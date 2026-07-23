import { useEffect, useMemo } from "react";
import { useAccountDetails } from "../hooks/useAccountDetail";
import { fmtNum, rarityBoxStyle } from "../lib/format";
import type { AccountListRow, UnitEntry } from "../lib/types";
import { CloseButton } from "./CloseButton";
import { SwordIcon } from "./icons";
import { UnitIconImage } from "./UnitIconImage";

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
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
              {units.map((u) => (
                <div
                  key={u.UniqueId}
                  style={rarityBoxStyle(u.Rarity)}
                  className="relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-[11px] p-1.5"
                >
                  {!!u.Equipped && (
                    <span className="font-display relative self-start rounded-md bg-black/50 px-1.5 py-0.5 text-xs leading-none font-bold text-white">
                      ✓
                    </span>
                  )}
                  <UnitIconImage
                    displayName={u.DisplayName}
                    className="absolute inset-0 size-full translate-y-[-2%] object-cover opacity-90"
                    fallback={<SwordIcon className="m-auto mt-3 size-5 text-white/85" />}
                  />
                  <div className="relative mt-auto w-full bg-gradient-to-t from-black/80 to-transparent px-0.5 pt-4 text-center">
                    <div className="font-display text-outline truncate text-[11px] font-semibold">
                      {u.DisplayName || u.Asset}
                    </div>
                    <div className="truncate text-[9px] font-semibold text-white/85">
                      Lv {fmtNum(u.Level)}
                      {u.Trait?.DisplayName ? ` · ${u.Trait.DisplayName}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
