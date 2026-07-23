import { forwardRef } from "react";
import type { AccountDetailsRow, AccountRow } from "../lib/types";
import { fmtFullNum, getCurrencyEntry } from "../lib/format";
import { CurrencyIcon } from "./AccountShowcaseCard";

const SIZE = 1000;

/** Square, stats-only snapshot — no unit art, just Level / Gems / Trait Crystal / Story & Raid progress / headline counts. */
export const StatsShowcaseCard = forwardRef<
  HTMLDivElement,
  { account: AccountRow; details: AccountDetailsRow | null | undefined }
>(function StatsShowcaseCard({ account }, ref) {
  const gems = getCurrencyEntry(account.currencies, "gem");
  const traitCrystal = getCurrencyEntry(account.currencies, "trait crystal");
  const story = account.progress?.Story;
  const raid = account.progress?.Raid;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[28px] font-sans text-white"
      style={{
        width: SIZE,
        height: SIZE,
        background:
          "radial-gradient(ellipse 900px 500px at 15% -10%, rgba(129,19,255,0.35), transparent 60%), radial-gradient(ellipse 900px 500px at 100% 15%, rgba(28,255,255,0.18), transparent 60%), #0d0a14",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-9">
        <div>
          <span className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">
            Anime Expeditions · Stats
          </span>
          <div className="font-display text-outline mt-2 text-8xl leading-none font-bold">
            LVL {account.level ?? "?"}
          </div>
        </div>

        <div className="flex items-stretch gap-3">
          <div className="gradient-cyan flex flex-1 items-center gap-3.5 rounded-2xl px-5 py-4 shadow-[0_6px_28px_rgba(0,0,0,0.5)]">
            <CurrencyIcon name="Gems" rbxAssetId={gems?.Icon} alt="Gems" fallback="💎" className="size-16" />
            <div>
              <div className="font-display text-outline text-4xl leading-none font-bold tabular-nums">
                {fmtFullNum(gems?.Amount ?? 0)}
              </div>
              <div className="text-outline mt-1 text-xs font-semibold uppercase">Gems</div>
            </div>
          </div>
          <div className="gradient-purple flex flex-1 items-center gap-3.5 rounded-2xl px-5 py-4 shadow-[0_6px_28px_rgba(0,0,0,0.5)]">
            <CurrencyIcon name="Trait Crystal" rbxAssetId={traitCrystal?.Icon} alt="Trait Crystal" fallback="🔮" className="size-16" />
            <div>
              <div className="font-display text-outline text-4xl leading-none font-bold tabular-nums">
                {fmtFullNum(traitCrystal?.Amount ?? 0)}
              </div>
              <div className="text-outline mt-1 text-xs font-semibold uppercase">Trait Crystal</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Units" value={fmtFullNum(account.unit_count)} />
          <StatTile label="Items" value={fmtFullNum(account.item_count)} />
          <StatTile label="Maps cleared" value={fmtFullNum(account.progress?.CompletedMapsCount ?? 0)} />
        </div>

        <div className="flex flex-col gap-4">
          <ProgressRow label="Story" percent={story?.Percent ?? 0} done={!!story?.Completed} />
          <ProgressRow label="Raid" percent={raid?.Percent ?? 0} done={!!raid?.Completed} />
        </div>
      </div>
    </div>
  );
});

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-center">
      <div className="text-[11px] font-semibold text-white/50 uppercase">{label}</div>
      <div className="font-display mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function ProgressRow({ label, percent, done }: { label: string; percent: number; done: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-white/70">
        <span>{label}</span>
        <span>{done ? "Completed!" : `${percent}%`}</span>
      </div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="gradient-purple h-full rounded-full shadow-[0_0_10px_rgba(129,19,255,0.6)]"
          style={{ width: `${Math.min(100, Math.max(0, done ? 100 : percent))}%` }}
        />
      </div>
    </div>
  );
}
