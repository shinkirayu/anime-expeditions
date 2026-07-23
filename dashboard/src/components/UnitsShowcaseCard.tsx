import { forwardRef, useMemo } from "react";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../lib/types";
import { rarityBoxStyle, rarityRank } from "../lib/format";
import { SwordIcon } from "./icons";
import { UnitIconImage } from "./UnitIconImage";

const SIZE = 1000;
const MAX_SHOWN = 24;
export const DEFAULT_UNIT_COLUMNS = 5;

/** Square gallery of the account's best units — same rarity-box tile as the Units page, sorted rarity-first then level. */
export const UnitsShowcaseCard = forwardRef<
  HTMLDivElement,
  { account: AccountRow; details: AccountDetailsRow | null | undefined; columns?: number }
>(function UnitsShowcaseCard({ details, columns = DEFAULT_UNIT_COLUMNS }, ref) {
  const units = useMemo(() => (details?.units ?? []) as UnitEntry[], [details]);

  const sorted = useMemo(
    () => units.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0)),
    [units],
  );
  const shown = sorted.slice(0, MAX_SHOWN);
  const remaining = sorted.length - shown.length;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] bg-[#0d0a14] font-sans text-white"
      style={{ width: SIZE, height: SIZE }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="relative z-10 flex h-full flex-col p-9">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-outline text-4xl font-bold">Units</h1>
          <span className="text-sm font-semibold text-white/50 uppercase">{units.length} owned</span>
        </div>

        <div className="mt-6 grid gap-3.5" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {shown.map((u) => (
            <UnitTile key={u.UniqueId} unit={u} />
          ))}
        </div>

        {remaining > 0 && (
          <p className="mt-4 text-center text-sm font-semibold text-white/40">
            +{remaining} more unit{remaining === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
});

function UnitTile({ unit }: { unit: UnitEntry }) {
  return (
    <div
      style={rarityBoxStyle(unit.Rarity)}
      className="relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-xl p-1.5"
    >
      <UnitIconImage
        displayName={unit.DisplayName}
        className="absolute inset-0 h-full w-full translate-y-[-2%] object-cover opacity-90"
        fallback={<SwordIcon className="mt-3 size-5 text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />}
      />
      <div className="relative mt-auto w-full bg-gradient-to-t from-black/80 to-transparent px-0.5 pt-4 text-center">
        <div className="font-display text-outline truncate text-[11px] font-semibold">
          {unit.DisplayName || unit.Asset}
        </div>
        <div className="truncate text-[9px] font-semibold text-white/85">
          Lv {unit.Level ?? "—"}
          {unit.Trait?.DisplayName ? ` · ${unit.Trait.DisplayName}` : ""}
        </div>
      </div>
    </div>
  );
}
