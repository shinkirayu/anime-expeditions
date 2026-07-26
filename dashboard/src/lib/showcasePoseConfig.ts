import type { PoseTransform, VisibleStats } from "../components/AccountShowcaseCard";

/**
 * Per-unit hero showcase config (pose framing + which stat pills are shown),
 * saved once and reused everywhere that unit gets featured — pose art isn't
 * uniformly framed per unit, so this avoids re-dialing it in on every
 * showcase/every account. Keyed by unit Asset (stable across accounts),
 * stored in this browser's localStorage.
 */

const STORAGE_KEY = "showcase.unitPoseConfig";

interface SavedUnitConfig {
  pose: PoseTransform;
  visibleStats: VisibleStats;
}

function readAll(): Record<string, SavedUnitConfig> {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SavedUnitConfig>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getSavedUnitPose(assetKey: string): SavedUnitConfig | null {
  if (!assetKey) return null;
  return readAll()[assetKey] ?? null;
}

export function saveUnitPose(assetKey: string, pose: PoseTransform, visibleStats: VisibleStats): void {
  if (!assetKey) return;
  const all = readAll();
  all[assetKey] = { pose, visibleStats };
  writeAll(all);
}

export function clearUnitPose(assetKey: string): void {
  if (!assetKey) return;
  const all = readAll();
  delete all[assetKey];
  writeAll(all);
}
