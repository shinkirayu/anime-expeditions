import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useToast } from "../Toast";
import { Dropdown } from "../Dropdown";
import { CloseButton } from "../CloseButton";
import { AccountShowcaseCard } from "../AccountShowcaseCard";
import { DEFAULT_UNIT_COLUMNS, UnitsShowcaseCard } from "../UnitsShowcaseCard";
import { DEFAULT_ITEM_COLUMNS, InventoryShowcaseCard } from "../InventoryShowcaseCard";
import { renderShowcasePng } from "../../lib/exportShowcase";
import { rarityRank } from "../../lib/format";
import { buildDefaultDescription, buildDefaultTitle } from "../../lib/eldoradoDescribe";
import { getSavedUnitPose } from "../../lib/showcasePoseConfig";
import { getLastBulkRunConfig, saveLastBulkRunConfig } from "../../lib/bulkRunConfig";
import { useEldoradoGames } from "../../hooks/useEldoradoGames";
import { MANUAL_DELIVERY_TIMES, PRICE_LIMITS, buildAccountBlobForUsername, getCachedGame, publishListing, setCachedGame } from "../../lib/eldorado";
import { markAccountsListed } from "../../lib/listedAccounts";
import type { DeliveryMethod, EncodedPhoto, GameOption } from "../../lib/eldoradoTypes";
import type { BulkListingState, BulkListingStatus, BulkListingTarget } from "../../lib/eldoradoTypes";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../../lib/types";

/**
 * Sequential bulk auto-lister: fetch account 1's showcase -> publish account
 * 1 -> once done, fetch account 2's showcase -> publish account 2 -> and so
 * on, fully automated after "Start". Each target becomes its own separate
 * listing (not bundled into one multi-stock offer) so per-account showcase
 * photos and titles are meaningful. Takes just usernames — each is matched
 * against tracked accounts (for title/description/showcase) and against the
 * Bulk Accounts pool (for real delivery credentials), independently, so this
 * works the same whether it's called from the Units tab or from Bulk Accounts.
 */
export function BulkAutoListModal({ usernames, onClose }: { usernames: string[]; onClose: () => void }) {
  const toast = useToast();
  const gamesQuery = useEldoradoGames(true);

  const accountQueries = useQueries({
    queries: usernames.map((username) => ({
      queryKey: ["account-by-username", username.toLowerCase()],
      queryFn: async (): Promise<AccountRow | null> => {
        const { data, error } = await supabase.from("accounts").select("*").ilike("username", username).maybeSingle();
        if (error) throw error;
        return data as AccountRow | null;
      },
    })),
  });
  const detailsQueries = useQueries({
    queries: usernames.map((_username, i) => {
      const userId = accountQueries[i]?.data?.user_id ?? null;
      return {
        queryKey: ["account-details", userId],
        enabled: userId != null,
        queryFn: async (): Promise<AccountDetailsRow | null> => {
          const { data, error } = await supabase
            .from("account_details")
            .select("user_id,units,inventory,updated_at")
            .eq("user_id", userId!)
            .maybeSingle();
          if (error) throw error;
          return data as AccountDetailsRow | null;
        },
      };
    }),
  });
  const resolving = accountQueries.some((q) => q.isLoading);

  const targets: BulkListingTarget[] = useMemo(
    () =>
      usernames.map((username, i) => {
        const account = accountQueries[i]?.data ?? null;
        const details = detailsQueries[i]?.data ?? null;
        return {
          key: username,
          title: account ? buildDefaultTitle(account) : `Anime Expeditions Account — ${username}`,
          description: account ? buildDefaultDescription(account, details) : `Account credentials for ${username}.`,
          accountBlob: buildAccountBlobForUsername(username),
          showcaseAccount: account ? { account, details } : undefined,
          listingUserId: account?.user_id,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usernames, accountQueries.map((q) => q.dataUpdatedAt).join(","), detailsQueries.map((q) => q.dataUpdatedAt).join(",")],
  );

  const cached = useMemo(() => getCachedGame(), []);
  const lastRun = useMemo(() => getLastBulkRunConfig(), []);
  const [gameId, setGameId] = useState(cached?.gameId ?? "");
  const [price, setPrice] = useState(lastRun?.price ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(lastRun?.deliveryMethod ?? "Automatic");
  const [manualDeliveryTime, setManualDeliveryTime] = useState(lastRun?.manualDeliveryTime ?? "Hour1");

  const [states, setStates] = useState<Record<string, BulkListingState>>(() =>
    Object.fromEntries(usernames.map((u) => [u, { status: "pending" as BulkListingStatus }])),
  );
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameId || !gamesQuery.data) return;
    const match = gamesQuery.data.find((g: GameOption) => /anime\s*expeditions?/i.test(g.name));
    if (match) {
      setGameId(match.gameId);
      setCachedGame(match.gameId, match.name);
    }
  }, [gamesQuery.data, gameId]);

  function updateState(key: string, patch: Partial<BulkListingState>): void {
    setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  const current = currentIndex != null ? targets[currentIndex] : null;
  const currentUnits = (current?.showcaseAccount?.details?.units ?? []) as UnitEntry[];
  const currentBestUnit = useMemo(() => {
    if (currentUnits.length === 0) return null;
    return currentUnits.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0))[0] ?? null;
  }, [currentUnits]);
  const currentPoseConfig = useMemo(() => {
    const saved = currentBestUnit?.Asset ? getSavedUnitPose(currentBestUnit.Asset) : null;
    return { pose: saved?.pose, visibleStats: saved?.visibleStats };
  }, [currentBestUnit]);

  async function dataUrlToEncodedPhoto(dataUrl: string, filename: string): Promise<EncodedPhoto> {
    const blob = await (await fetch(dataUrl)).blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { name: filename, mimeType: blob.type || "image/png", bytes };
  }

  // Drives the whole run: whenever currentIndex advances, process that
  // target (fetch -> publish) then advance again, until the batch is done or
  // Stop was pressed.
  useEffect(() => {
    if (currentIndex == null) return;
    if (currentIndex >= targets.length || stopRef.current) {
      setCurrentIndex(null);
      setRunning(false);
      return;
    }

    let cancelled = false;
    const target = targets[currentIndex];

    (async () => {
      updateState(target.key, { status: "fetching" });
      const photos: EncodedPhoto[] = [];
      if (target.showcaseAccount) {
        try {
          await new Promise((r) => setTimeout(r, 350)); // let off-screen art/icons finish loading
          const jobs: { ref: React.RefObject<HTMLDivElement | null>; label: string }[] = [
            { ref: heroRef, label: "hero" },
            { ref: unitsRef, label: "units" },
            { ref: inventoryRef, label: "inventory" },
          ];
          for (const { ref, label } of jobs) {
            if (!ref.current) continue;
            const dataUrl = await renderShowcasePng(ref.current);
            photos.push(await dataUrlToEncodedPhoto(dataUrl, `${target.key}-${label}.png`));
          }
        } catch (err) {
          console.error("Showcase fetch failed for", target.key, err);
        }
      }

      if (cancelled || stopRef.current) return;
      updateState(target.key, { status: "publishing" });
      try {
        const res = await publishListing({
          gameId,
          offerTitle: target.title,
          description: target.description,
          price: Number.parseFloat(price),
          hasOriginalEmail: false,
          photos,
          deliveryMethod,
          accounts: deliveryMethod === "Automatic" ? [target.accountBlob] : [],
          manualDeliveryTime,
          quantity: 1,
        });
        updateState(target.key, { status: "done", offerId: res.offerId });
        if (target.listingUserId) markAccountsListed([target.listingUserId], "eldorado");
      } catch (err) {
        updateState(target.key, { status: "error", error: err instanceof Error ? err.message : String(err) });
      }

      if (!cancelled && !stopRef.current) setCurrentIndex((i) => (i ?? 0) + 1);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  function start(): void {
    const priceNum = Number.parseFloat(price);
    if (!gameId) return toast.error("Select a game.");
    if (!Number.isFinite(priceNum) || priceNum < PRICE_LIMITS.minOfferValue) return toast.error("Enter a valid price.");
    saveLastBulkRunConfig({ price, deliveryMethod, manualDeliveryTime });
    stopRef.current = false;
    setRunning(true);
    setCurrentIndex(0);
  }

  function stop(): void {
    stopRef.current = true;
  }

  const doneCount = Object.values(states).filter((s) => s.status === "done").length;
  const errorCount = Object.values(states).filter((s) => s.status === "error").length;
  const finished = !running && currentIndex == null && (doneCount > 0 || errorCount > 0);

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={running ? undefined : onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-fuchsia-500/15 dark:bg-[#150f22]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-fuchsia-500/10">
          <h2 className="font-display font-semibold">Bulk list on Eldorado ({usernames.length})</h2>
          {!running && <CloseButton onClick={onClose} />}
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          {!running && currentIndex == null && !finished && (
            <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                One shared price/delivery setting applies to every listing below — titles, descriptions, and photos are
                generated per account automatically. Once started this runs on its own: fetch, publish, next account,
                fetch, publish… until all {usernames.length} are done.
              </p>

              {resolving && <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Loading account details…</p>}

              <div className="space-y-1.5">
                <label className={labelCls}>Game</label>
                {gamesQuery.isLoading ? (
                  <div className={`${inputCls} text-zinc-400`}>Loading games…</div>
                ) : (
                  <Dropdown
                    value={gameId}
                    onChange={setGameId}
                    label="Game"
                    ariaLabel="Select game"
                    fullWidth
                    placeholder="Select a game…"
                    options={(gamesQuery.data ?? []).map((g) => ({ value: g.gameId, label: g.name }))}
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Price per account (USD)</label>
                <input
                  type="number"
                  min={PRICE_LIMITS.minOfferValue}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Delivery method</label>
                <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
                  <button
                    onClick={() => setDeliveryMethod("Automatic")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      deliveryMethod === "Automatic" ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Automatic
                  </button>
                  <button
                    onClick={() => setDeliveryMethod("Manual")}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      deliveryMethod === "Manual" ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Manual
                  </button>
                </div>
                {deliveryMethod === "Automatic" && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Each account's credential blob (real, if it matched a Bulk Accounts entry — a fill-in-the-blank
                    placeholder otherwise) is sent as-is.
                  </p>
                )}
              </div>

              {deliveryMethod === "Manual" && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Guaranteed delivery time</label>
                  <Dropdown
                    value={manualDeliveryTime}
                    onChange={setManualDeliveryTime}
                    label="Delivery time"
                    ariaLabel="Select guaranteed delivery time"
                    fullWidth
                    options={MANUAL_DELIVERY_TIMES}
                  />
                </div>
              )}

              <button
                onClick={start}
                disabled={resolving}
                className="gradient-purple w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start ({usernames.length} listing{usernames.length === 1 ? "" : "s"})
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const s = states[t.key];
                  return (
                    <tr key={t.key} className="border-b border-zinc-100 last:border-0 dark:border-white/5">
                      <td className="max-w-48 truncate px-3 py-1.5" title={t.title}>
                        {t.title}
                      </td>
                      <td className="px-2 py-1.5">
                        {s.status === "pending" && <span className="text-zinc-400">Pending</span>}
                        {s.status === "fetching" && <span className="text-fuchsia-600 dark:text-fuchsia-400">Fetching photos…</span>}
                        {s.status === "publishing" && <span className="text-fuchsia-600 dark:text-fuchsia-400">Publishing…</span>}
                        {s.status === "done" && <span className="text-emerald-600 dark:text-emerald-400">✓ {s.offerId}</span>}
                        {s.status === "error" && (
                          <span className="text-red-600 dark:text-red-400" title={s.error}>
                            ✕ {s.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {running && (
            <button
              onClick={stop}
              className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-800 dark:text-red-400"
            >
              Stop after current listing
            </button>
          )}

          {finished && (
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium">
                Done — {doneCount} published{errorCount > 0 ? `, ${errorCount} failed` : ""}.
              </p>
              <button onClick={onClose} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium dark:border-zinc-700">
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {current?.showcaseAccount && (
        <div className="pointer-events-none fixed top-0 -left-[9999px] opacity-0" aria-hidden="true">
          <AccountShowcaseCard
            ref={heroRef}
            account={current.showcaseAccount.account}
            details={current.showcaseAccount.details}
            pose={currentPoseConfig.pose}
            visibleStats={currentPoseConfig.visibleStats}
          />
          <UnitsShowcaseCard ref={unitsRef} account={current.showcaseAccount.account} details={current.showcaseAccount.details} columns={DEFAULT_UNIT_COLUMNS} />
          <InventoryShowcaseCard
            ref={inventoryRef}
            account={current.showcaseAccount.account}
            details={current.showcaseAccount.details}
            columns={DEFAULT_ITEM_COLUMNS}
          />
        </div>
      )}
    </div>
  );
}
