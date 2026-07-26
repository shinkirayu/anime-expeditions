import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../lib/types";
import { renderShowcasePng, showcaseFilename } from "../lib/exportShowcase";
import { rarityRank } from "../lib/format";
import { clearUnitPose, getSavedUnitPose, saveUnitPose } from "../lib/showcasePoseConfig";
import {
  AccountShowcaseCard,
  DEFAULT_POSE_TRANSFORM,
  DEFAULT_VISIBLE_STATS,
  type PoseTransform,
  type VisibleStats,
} from "./AccountShowcaseCard";
import { DEFAULT_UNIT_COLUMNS, UnitsShowcaseCard } from "./UnitsShowcaseCard";
import { DEFAULT_ITEM_COLUMNS, InventoryShowcaseCard } from "./InventoryShowcaseCard";
import { StatsShowcaseCard } from "./StatsShowcaseCard";
import { CloseButton } from "./CloseButton";
import { useToast } from "./Toast";

const SHOWCASE_TYPES = ["hero", "units", "inventory", "stats"] as const;
type ShowcaseType = (typeof SHOWCASE_TYPES)[number];
const SHOWCASE_LABELS: Record<ShowcaseType, string> = {
  hero: "Hero",
  units: "Units",
  inventory: "Inventory",
  stats: "Stats",
};

/**
 * Showcase customization + render UI (pose, stats, featured unit, tile columns), shared between
 * AccountPage's "Export showcase" (downloads the PNG) and the Eldorado listing form (adds the PNG
 * to the listing's photos instead). `actionLabel`/`onAction` decide what happens to the render.
 */
export function ShowcaseGeneratorModal({
  account,
  details,
  onClose,
  actionLabel,
  onAction,
}: {
  account: AccountRow;
  details: AccountDetailsRow | null | undefined;
  onClose: () => void;
  actionLabel: string;
  onAction: (dataUrl: string, filename: string) => void;
}) {
  const toast = useToast();
  const [showcaseType, setShowcaseType] = useState<ShowcaseType>("hero");
  const [showcasePng, setShowcasePng] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [pose, setPose] = useState<PoseTransform>(DEFAULT_POSE_TRANSFORM);
  const [visibleStats, setVisibleStats] = useState<VisibleStats>(DEFAULT_VISIBLE_STATS);
  const [featuredUnitId, setFeaturedUnitId] = useState<string | null>(null);
  const [unitColumns, setUnitColumns] = useState(DEFAULT_UNIT_COLUMNS);
  const [itemColumns, setItemColumns] = useState(DEFAULT_ITEM_COLUMNS);
  const [hasSavedPose, setHasSavedPose] = useState(false);
  const poseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columnsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedAssetRef = useRef<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const showcaseRefs: Record<ShowcaseType, React.RefObject<HTMLDivElement | null>> = {
    hero: heroRef,
    units: unitsRef,
    inventory: inventoryRef,
    stats: statsRef,
  };

  async function renderType(type: ShowcaseType) {
    const node = showcaseRefs[type].current;
    if (!node) return;
    setRendering(true);
    try {
      setShowcasePng(await renderShowcasePng(node));
    } catch (err) {
      console.error("Showcase render failed", err);
    } finally {
      setRendering(false);
    }
  }

  useEffect(() => {
    void renderType(showcaseType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = (details?.units ?? []) as UnitEntry[];

  // Whichever unit is actually featured — manually picked, or the "auto (best
  // unit)" pick when none is — mirrors AccountShowcaseCard's own selection so
  // saved pose configs apply consistently whether the pick was manual or auto.
  const featuredUnit = useMemo(() => {
    if (units.length === 0) return null;
    const manual = featuredUnitId ? units.find((u) => u.UniqueId === featuredUnitId) : null;
    if (manual) return manual;
    return (
      units.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0))[0] ?? null
    );
  }, [units, featuredUnitId]);

  // Whenever the featured unit changes (manual pick, auto pick on load, or a
  // different account entirely), load its saved pose/stats config if one was
  // saved for it before — otherwise fall back to the defaults.
  useEffect(() => {
    const key = featuredUnit?.Asset;
    if (!key || appliedAssetRef.current === key) return;
    appliedAssetRef.current = key;
    const saved = getSavedUnitPose(key);
    setPose(saved?.pose ?? DEFAULT_POSE_TRANSFORM);
    setVisibleStats(saved?.visibleStats ?? DEFAULT_VISIBLE_STATS);
    setHasSavedPose(!!saved);
    setTimeout(() => renderType("hero"), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredUnit?.Asset]);

  async function switchShowcase(type: ShowcaseType) {
    setShowcaseType(type);
    setShowcasePng(null);
    await renderType(type);
  }

  function adjustPose(patch: Partial<PoseTransform>) {
    setPose((prev) => ({ ...prev, ...patch }));
    if (poseDebounceRef.current) clearTimeout(poseDebounceRef.current);
    poseDebounceRef.current = setTimeout(() => renderType("hero"), 250);
  }

  function toggleStat(key: keyof VisibleStats) {
    setVisibleStats((prev) => ({ ...prev, [key]: !prev[key] }));
    setTimeout(() => renderType("hero"), 50);
  }

  function selectFeaturedUnit(unitId: string) {
    setFeaturedUnitId(unitId || null);
  }

  function adjustColumns(type: "units" | "inventory", columns: number) {
    if (type === "units") setUnitColumns(columns);
    else setItemColumns(columns);
    if (columnsDebounceRef.current) clearTimeout(columnsDebounceRef.current);
    columnsDebounceRef.current = setTimeout(() => renderType(type), 250);
  }

  function saveCurrentPose() {
    const key = featuredUnit?.Asset;
    if (!key) return;
    saveUnitPose(key, pose, visibleStats);
    setHasSavedPose(true);
    toast.success("Config saved", `${featuredUnit?.DisplayName || key} will use this pose and stats next time.`);
  }

  function resetCurrentPose() {
    const key = featuredUnit?.Asset;
    setPose(DEFAULT_POSE_TRANSFORM);
    setVisibleStats(DEFAULT_VISIBLE_STATS);
    if (key) clearUnitPose(key);
    setHasSavedPose(false);
    setTimeout(() => renderType("hero"), 50);
  }

  const index = SHOWCASE_TYPES.indexOf(showcaseType);
  const go = (delta: number) => {
    void switchShowcase(SHOWCASE_TYPES[(index + delta + SHOWCASE_TYPES.length) % SHOWCASE_TYPES.length]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-[min(94vw,860px)] gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">Showcase</h2>
            <CloseButton onClick={onClose} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => go(-1)}
              aria-label="Previous showcase"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              ‹
            </button>

            <div className="flex min-h-[300px] flex-1 items-center justify-center">
              {rendering || !showcasePng ? (
                <div className="flex aspect-square w-full items-center justify-center text-sm text-white/50">Rendering…</div>
              ) : (
                <img
                  src={showcasePng}
                  alt={`${SHOWCASE_LABELS[showcaseType]} showcase`}
                  className="max-h-[70vh] w-full rounded-2xl object-contain shadow-2xl"
                />
              )}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Next showcase"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              ›
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {SHOWCASE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => switchShowcase(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  t === showcaseType ? "gradient-purple text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {SHOWCASE_LABELS[t]}
              </button>
            ))}
          </div>

          <button
            onClick={() => showcasePng && onAction(showcasePng, showcaseFilename(account.username, showcaseType))}
            disabled={rendering || !showcasePng}
            className="gradient-purple rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLabel}
          </button>
        </div>

        {showcaseType === "hero" && (
          <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border-l border-white/10 bg-white/5 p-3">
            <label className="flex flex-col gap-1.5 text-xs text-white/70">
              <span className="font-semibold">Unit</span>
              <select
                value={featuredUnitId ?? ""}
                onChange={(e) => selectFeaturedUnit(e.target.value)}
                className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-white outline-none"
              >
                <option value="">Auto (best unit)</option>
                {units.map((u) => (
                  <option key={u.UniqueId} value={u.UniqueId}>
                    {u.DisplayName || u.Asset} ({u.Rarity ?? "?"})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <StatCheckbox label="Level" checked={visibleStats.level} onChange={() => toggleStat("level")} />
              <StatCheckbox label="Gems" checked={visibleStats.gems} onChange={() => toggleStat("gems")} />
              <StatCheckbox label="Traits" checked={visibleStats.traits} onChange={() => toggleStat("traits")} />
              <StatCheckbox label="Story completed" checked={visibleStats.story} onChange={() => toggleStat("story")} />
            </div>

            <p className="text-[11px] font-semibold text-white/50 uppercase">
              Pose art doesn't come framed the same for every unit — adjust it here
            </p>
            <PoseSlider label="Size" min={80} max={350} value={pose.size} onChange={(size) => adjustPose({ size })} />
            <PoseSlider label="Horizontal" min={0} max={100} value={pose.x} onChange={(x) => adjustPose({ x })} />
            <PoseSlider label="Vertical" min={0} max={100} value={pose.y} onChange={(y) => adjustPose({ y })} />

            <div className="mt-1 flex flex-col gap-1.5 border-t border-white/10 pt-3">
              {hasSavedPose && (
                <span className="text-[11px] font-semibold text-emerald-400">
                  ✓ Saved — reused automatically next time {featuredUnit?.DisplayName || "this unit"} is featured.
                </span>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={saveCurrentPose}
                  disabled={!featuredUnit}
                  className="flex-1 rounded-md bg-white/15 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save config for this unit
                </button>
                {hasSavedPose && (
                  <button
                    onClick={resetCurrentPose}
                    className="rounded-md border border-white/15 px-2 py-1.5 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/10"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showcaseType === "units" && (
          <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border-l border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold text-white/50 uppercase">Tile size</p>
            <PoseSlider label="Columns" min={3} max={8} value={unitColumns} onChange={(columns) => adjustColumns("units", columns)} />
            <p className="text-[11px] text-white/40">Fewer columns = bigger unit tiles.</p>
          </div>
        )}

        {showcaseType === "inventory" && (
          <div className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border-l border-white/10 bg-white/5 p-3">
            <p className="text-[11px] font-semibold text-white/50 uppercase">Tile size</p>
            <PoseSlider label="Columns" min={3} max={8} value={itemColumns} onChange={(columns) => adjustColumns("inventory", columns)} />
            <p className="text-[11px] text-white/40">Fewer columns = bigger item tiles.</p>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed top-0 -left-[9999px] opacity-0" aria-hidden="true">
        <AccountShowcaseCard ref={heroRef} account={account} details={details} pose={pose} visibleStats={visibleStats} unitId={featuredUnitId} />
        <UnitsShowcaseCard ref={unitsRef} account={account} details={details} columns={unitColumns} />
        <InventoryShowcaseCard ref={inventoryRef} account={account} details={details} columns={itemColumns} />
        <StatsShowcaseCard ref={statsRef} account={account} details={details} />
      </div>
    </div>
  );
}

function StatCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-white/70">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-fuchsia-500" />
      {label}
    </label>
  );
}

function PoseSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/70">
      <span className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{value}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-fuchsia-500" />
    </label>
  );
}
