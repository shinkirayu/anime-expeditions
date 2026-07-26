import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../Toast";
import { Dropdown } from "../Dropdown";
import { ShowcaseGeneratorModal } from "../ShowcaseGeneratorModal";
import { AccountShowcaseCard, DEFAULT_POSE_TRANSFORM, DEFAULT_VISIBLE_STATS } from "../AccountShowcaseCard";
import { DEFAULT_UNIT_COLUMNS, UnitsShowcaseCard } from "../UnitsShowcaseCard";
import { DEFAULT_ITEM_COLUMNS, InventoryShowcaseCard } from "../InventoryShowcaseCard";
import { renderShowcasePng } from "../../lib/exportShowcase";
import { rarityRank } from "../../lib/format";
import { getSavedUnitPose } from "../../lib/showcasePoseConfig";
import { useEldoradoQueue } from "../../lib/eldoradoQueue";
import { useEldoradoGames } from "../../hooks/useEldoradoGames";
import {
  ACCEPTED_IMAGE_TYPES,
  MANUAL_DELIVERY_TIMES,
  PRICE_LIMITS,
  buildAccountBlobForUsername,
  deleteTemplate as deleteTemplateStorage,
  ensureWarning,
  findBulkAccountByUsername,
  getBulkAccounts,
  getCachedGame,
  getTemplates,
  publishListing,
  saveTemplate as saveTemplateStorage,
  setBulkAccountsUsed,
  setCachedGame,
} from "../../lib/eldorado";
import { markAccountsListed } from "../../lib/listedAccounts";
import type { BulkAccount, DeliveryMethod, EncodedPhoto, GameOption, ListingDraft, ListingTemplate } from "../../lib/eldoradoTypes";
import type { AccountDetailsRow, AccountRow, UnitEntry } from "../../lib/types";

/** Port of eldorado/src/renderer/src/pages/NewListing.tsx. */

interface Photo {
  id: string;
  file: File;
  url: string;
}

interface Props {
  initialTitle?: string;
  initialDescription?: string;
  /** Pre-seeds Automatic delivery with one entry per username (e.g. accounts picked from the dashboard) — auto-matched against the Bulk Accounts pool by username. */
  initialAccountUsernames?: string[];
  /** When set, auto-renders that account's showcase image and attaches it as the main photo. */
  showcaseAccount?: { account: AccountRow; details: AccountDetailsRow | null | undefined };
  /** Accounts this listing represents — marked "listed" (Units tab tag) once publish succeeds. */
  listingUserIds?: number[];
}

export function NewListingView({ initialTitle, initialDescription, initialAccountUsernames, showcaseAccount, listingUserIds }: Props) {
  const toast = useToast();
  const queue = useEldoradoQueue();
  const gamesQuery = useEldoradoGames(true);
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);

  const cached = useMemo(() => getCachedGame(), []);
  const [gameId, setGameId] = useState(cached?.gameId ?? "");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [price, setPrice] = useState("");
  const [originalEmail, setOriginalEmail] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const hasInitialAccounts = !!initialAccountUsernames && initialAccountUsernames.length > 0;
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(hasInitialAccounts ? "Automatic" : "Manual");
  const [manualDeliveryTime, setManualDeliveryTime] = useState("Hour1");
  const [quantity, setQuantity] = useState("1");
  const [accounts, setAccounts] = useState<string[]>(() =>
    initialAccountUsernames && initialAccountUsernames.length > 0
      ? initialAccountUsernames.map((username) => buildAccountBlobForUsername(username))
      : [""],
  );

  const [bulkAccounts, setBulkAccounts] = useState<BulkAccount[]>(() => getBulkAccounts());
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pickerFilter, setPickerFilter] = useState("");

  const [templates, setTemplates] = useState<ListingTemplate[]>(() => getTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishStep, setPublishStep] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const quickHeroRef = useRef<HTMLDivElement>(null);
  const quickUnitsRef = useRef<HTMLDivElement>(null);
  const quickInventoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  /** Converts a rendered PNG into a photo entry, prepended so it becomes the main photo. */
  async function addPngAsPhoto(dataUrl: string, filename: string): Promise<void> {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: blob.type || "image/png" });
    setPhotos((prev) => [
      { id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) },
      ...prev,
    ]);
  }

  /** Turns a rendered showcase PNG into a photo entry instead of downloading it. */
  async function useShowcaseAsPhoto(dataUrl: string, filename: string): Promise<void> {
    try {
      await addPngAsPhoto(dataUrl, filename);
      setShowcaseModalOpen(false);
      toast.success("Photo added", "The showcase image was added as a photo.");
    } catch (err) {
      toast.error("Could not add photo", err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * One-click "grab everything" — renders Inventory, Units, and Hero (in that
   * order) and adds all three as photos. Each add prepends, so Hero — added
   * last — ends up first in the list, i.e. the main offer image, without
   * needing any manual reordering.
   */
  async function fetchAllShowcases(): Promise<void> {
    if (!showcaseAccount) return;
    setFetchingAll(true);
    try {
      const jobs: { ref: React.RefObject<HTMLDivElement | null>; label: string }[] = [
        { ref: quickInventoryRef, label: "inventory" },
        { ref: quickUnitsRef, label: "units" },
        { ref: quickHeroRef, label: "hero" },
      ];
      let added = 0;
      for (const { ref, label } of jobs) {
        const node = ref.current;
        if (!node) continue;
        const dataUrl = await renderShowcasePng(node);
        await addPngAsPhoto(dataUrl, `${showcaseAccount.account.username}-${label}.png`);
        added += 1;
      }
      toast.success(`Fetched ${added} showcase photo(s)`, "The hero showcase is set as the main photo.");
    } catch (err) {
      toast.error("Could not fetch showcase photos", err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingAll(false);
    }
  }

  /** Promotes a photo to the front of the list, making it the main offer image. */
  function setAsMainPhoto(id: string): void {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  // Auto-pick "Anime Expeditions" the first time the catalog loads, if nothing cached yet.
  useEffect(() => {
    if (gameId || !gamesQuery.data) return;
    const match = gamesQuery.data.find((g: GameOption) => /anime\s*expeditions?/i.test(g.name));
    if (match) {
      setGameId(match.gameId);
      setCachedGame(match.gameId, match.name);
    }
  }, [gamesQuery.data, gameId]);

  const priceNum = useMemo(() => Number.parseFloat(price), [price]);
  const isAuto = deliveryMethod === "Automatic";
  const gameName = gamesQuery.data?.find((g) => g.gameId === gameId)?.name || gameId;

  // "Quick fetch all 3" has no unit picker, so it always uses the auto-picked
  // best unit — mirroring ShowcaseGeneratorModal's own "Auto (best unit)"
  // logic — and must look up that unit's saved pose/stats config the same
  // way, or the quick hero render silently ignores it and falls back to defaults.
  const quickBestUnit = useMemo(() => {
    const units = (showcaseAccount?.details?.units ?? []) as UnitEntry[];
    if (units.length === 0) return null;
    return units.slice().sort((a, b) => rarityRank(a.Rarity) - rarityRank(b.Rarity) || (b.Level ?? 0) - (a.Level ?? 0))[0] ?? null;
  }, [showcaseAccount]);

  const quickHeroConfig = useMemo(() => {
    const saved = quickBestUnit?.Asset ? getSavedUnitPose(quickBestUnit.Asset) : null;
    return { pose: saved?.pose ?? DEFAULT_POSE_TRANSFORM, visibleStats: saved?.visibleStats ?? DEFAULT_VISIBLE_STATS };
  }, [quickBestUnit]);

  function onSelectGame(id: string): void {
    setGameId(id);
    const game = gamesQuery.data?.find((g) => g.gameId === id);
    if (game) setCachedGame(game.gameId, game.name);
  }

  function addFiles(files: FileList | File[]): void {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (Array.from(files).length - incoming.length > 0) toast.info("Some files skipped", "Only image files can be added.");
    setPhotos((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removePhoto(id: string): void {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  // ---- bulk account picker ----
  const availableAccounts = useMemo(
    () =>
      bulkAccounts
        .filter((a) => !a.used)
        .filter((a) => (pickerFilter.trim() ? a.user.toLowerCase().includes(pickerFilter.trim().toLowerCase()) : true)),
    [bulkAccounts, pickerFilter],
  );

  function togglePicked(id: string): void {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addPickedAccounts(): void {
    const chosen = bulkAccounts.filter((a) => picked.has(a.id));
    if (chosen.length === 0) return;
    const blobs = chosen.map((a) => ensureWarning(`User: ${a.user}\nPass: ${a.pass}`));

    setAccounts((prev) => {
      const kept = prev.filter((a) => a.trim().length > 0);
      return [...kept, ...blobs];
    });

    setBulkAccounts(setBulkAccountsUsed([...picked], true));
    setPicked(new Set());
    setShowPicker(false);
    toast.success(`Added ${chosen.length} account(s)`, "Marked as used in Bulk Accounts so they are not reused.");
  }

  function updateAccount(i: number, value: string): void {
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }
  function addAccount(): void {
    setAccounts((prev) => [...prev, ""]);
  }
  function removeAccount(i: number): void {
    setAccounts((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  // Re-scans entries still in the "Roblox username: X" placeholder form (i.e. not yet
  // filled in, and not manually edited) and swaps in real credentials wherever the
  // username now matches a Bulk Accounts pool entry — useful when the pool was
  // updated after this form was already open.
  function autofillFromBulkAccounts(): void {
    let filled = 0;
    setAccounts((prev) =>
      prev.map((blob) => {
        const match = blob.match(/^Roblox username:\s*(.+)$/m);
        if (!match) return blob;
        const bulkMatch = findBulkAccountByUsername(match[1].trim());
        if (!bulkMatch) return blob;
        filled += 1;
        return ensureWarning(`User: ${bulkMatch.user}\nPass: ${bulkMatch.pass}`);
      }),
    );
    if (filled > 0) toast.success(`Auto-filled ${filled} account(s)`, "Matched by username in your Bulk Accounts pool.");
    else toast.info("No matches found", "None of the placeholder usernames matched your Bulk Accounts pool.");
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!gameId) e.gameId = "Select a game.";
    if (!title.trim()) e.title = "Listing title is required.";
    if (!description.trim()) e.description = "Description is required.";
    if (!price.trim() || Number.isNaN(priceNum)) e.price = "Enter a price.";
    else if (priceNum < PRICE_LIMITS.minOfferValue) e.price = `Minimum offer value is $${PRICE_LIMITS.minOfferValue.toFixed(2)}.`;
    else if (priceNum > PRICE_LIMITS.maxUnitPrice) e.price = `Maximum price is $${PRICE_LIMITS.maxUnitPrice}.`;

    if (isAuto) {
      if (accounts.every((a) => !a.trim())) e.accounts = "Automatic delivery needs at least one account filled in.";
    } else {
      const q = Number.parseInt(quantity, 10);
      if (Number.isNaN(q) || q < 1) e.quantity = "Quantity must be at least 1.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function resetUnique(): void {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setTitle("");
    setAccounts([""]);
    setPhotos([]);
    setErrors({});
  }

  function clearForm(): void {
    resetUnique();
    setGameId("");
    setDescription("");
    setPrice("");
    setOriginalEmail(false);
    setDeliveryMethod("Automatic");
    setManualDeliveryTime("Hour1");
    setQuantity("1");
    setSelectedTemplate("");
  }

  async function encodePhotos(): Promise<EncodedPhoto[]> {
    return Promise.all(
      photos.map(async (p) => ({
        name: p.file.name,
        mimeType: p.file.type,
        bytes: new Uint8Array(await p.file.arrayBuffer()),
      })),
    );
  }

  function buildDraft(encoded: EncodedPhoto[]): ListingDraft {
    return {
      gameId,
      gameName,
      offerTitle: title.trim(),
      description: description.trim(),
      price: priceNum,
      hasOriginalEmail: originalEmail,
      deliveryMethod,
      accounts: accounts.map(ensureWarning),
      manualDeliveryTime,
      quantity: Number.parseInt(quantity, 10) || 1,
      photos: encoded,
    };
  }

  async function publish(keepShared: boolean): Promise<void> {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    try {
      setPublishStep(photos.length > 0 ? `Uploading ${photos.length} photo(s)…` : "Creating listing…");
      const encoded = await encodePhotos();
      setPublishStep("Publishing listing…");
      const draft = buildDraft(encoded);
      const res = await publishListing({
        gameId: draft.gameId,
        offerTitle: draft.offerTitle,
        description: draft.description,
        price: draft.price,
        hasOriginalEmail: draft.hasOriginalEmail,
        photos: draft.photos,
        deliveryMethod: draft.deliveryMethod,
        accounts: draft.accounts,
        manualDeliveryTime: draft.manualDeliveryTime,
        quantity: draft.quantity,
      });
      toast.success("Listing published", `Offer ${res.offerId} created with ${res.uploadedImages} image(s).`);
      if (listingUserIds?.length) markAccountsListed(listingUserIds, "eldorado");
      keepShared ? resetUnique() : clearForm();
    } catch (err) {
      toast.error("Publish failed", err instanceof Error ? err.message : String(err));
    } finally {
      setPublishStep(null);
    }
  }

  async function addToQueue(): Promise<void> {
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setPublishStep("Preparing photos…");
    try {
      const encoded = await encodePhotos();
      queue.add(buildDraft(encoded));
      toast.success("Added to batch queue", "Publish it from the Batch Queue tab.");
      resetUnique();
    } finally {
      setPublishStep(null);
    }
  }

  // ---- templates ----
  function applyTemplate(name: string): void {
    setSelectedTemplate(name);
    const t = templates.find((x) => x.name === name);
    if (!t) return;
    setGameId(t.gameId);
    setTitle(t.offerTitle);
    setDescription(t.description);
    setPrice(t.price != null ? String(t.price) : "");
    setOriginalEmail(t.hasOriginalEmail);
    setDeliveryMethod(t.deliveryMethod);
    setManualDeliveryTime(t.manualDeliveryTime);
    setQuantity(String(t.quantity));
    toast.info("Template loaded", name);
  }

  function handleSaveTemplate(): void {
    const name = templateName.trim();
    if (!name) return toast.error("Enter a template name");
    try {
      const list = saveTemplateStorage({
        name,
        gameId,
        offerTitle: title,
        description,
        price: Number.isNaN(priceNum) ? null : priceNum,
        hasOriginalEmail: originalEmail,
        deliveryMethod,
        manualDeliveryTime,
        quantity: Number.parseInt(quantity, 10) || 1,
      });
      setTemplates(list);
      setSelectedTemplate(name);
      setSavingTemplate(false);
      setTemplateName("");
      toast.success("Template saved", name);
    } catch (err) {
      toast.error("Could not save template", err instanceof Error ? err.message : String(err));
    }
  }

  function handleDeleteTemplate(): void {
    if (!selectedTemplate) return;
    setTemplates(deleteTemplateStorage(selectedTemplate));
    setSelectedTemplate("");
    toast.info("Template deleted");
  }

  const busy = publishStep !== null;
  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  // Native <select> popups render with the select's own background/text color, not the page's —
  // "transparent" leaves them white regardless of dark mode, so selects need an explicit color pair.
  const selectCls =
    "w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";
  const errCls = "text-[11px] text-red-600 dark:text-red-400";

  return (
    <div className="space-y-4">
      {busy && (
        <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-medium text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">
          {publishStep}
        </div>
      )}

      {/* Template bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 p-3 dark:border-white/10">
        <Dropdown
          value={selectedTemplate}
          onChange={applyTemplate}
          label="Template"
          ariaLabel="Select template"
          options={[{ value: "", label: "— none —" }, ...templates.map((t) => ({ value: t.name, label: t.name }))]}
        />
        {savingTemplate ? (
          <>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              autoFocus
              className={`${inputCls} w-40`}
            />
            <button onClick={handleSaveTemplate} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium dark:border-zinc-700">
              Save
            </button>
            <button onClick={() => setSavingTemplate(false)} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium dark:border-zinc-700">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setSavingTemplate(true)} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium dark:border-zinc-700">
              Save as…
            </button>
            <button
              onClick={handleDeleteTemplate}
              disabled={!selectedTemplate}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium disabled:opacity-40 dark:border-zinc-700"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Offer details */}
      <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display text-sm font-semibold">Offer Details</h3>

        <div className="space-y-1.5">
          <label className={labelCls}>Game</label>
          {gamesQuery.isError ? (
            <p className={errCls}>Failed to load games.</p>
          ) : gamesQuery.isLoading ? (
            <div className={`${selectCls} text-zinc-400 dark:text-zinc-500`}>Loading games…</div>
          ) : (
            <Dropdown
              value={gameId}
              onChange={onSelectGame}
              label="Game"
              ariaLabel="Select game"
              fullWidth
              placeholder="Select a game…"
              options={(gamesQuery.data ?? []).map((g) => ({ value: g.gameId, label: g.name }))}
            />
          )}
          {errors.gameId && <p className={errCls}>{errors.gameId}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Listing Title</label>
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Maxed account, rare units, original email"
            className={inputCls}
          />
          {errors.title && <p className={errCls}>{errors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe the account: level, units, rank, bindings, etc."
            className={inputCls}
          />
          {errors.description && <p className={errCls}>{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Price (USD)</label>
            <input
              type="number"
              min={PRICE_LIMITS.minOfferValue}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
            {errors.price && <p className={errCls}>{errors.price}</p>}
          </div>
          <label className="mt-5 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={originalEmail} onChange={(e) => setOriginalEmail(e.target.checked)} className="accent-fuchsia-500" />
            Original email included
          </label>
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold">Photos</h3>
          {showcaseAccount && (
            <div className="flex gap-1.5">
              <button
                onClick={fetchAllShowcases}
                disabled={fetchingAll}
                type="button"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
              >
                {fetchingAll ? "Fetching…" : "Quick fetch all 3"}
              </button>
              <button
                onClick={() => setShowcaseModalOpen(true)}
                type="button"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium dark:border-zinc-700"
              >
                Use account showcase
              </button>
            </div>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          The first photo becomes the main offer image — click a photo's star to make it the main one.
          {showcaseAccount && " \"Quick fetch all 3\" grabs Inventory, Units, and Hero at once, with Hero set as the main photo."}
        </p>

        <div
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-xs text-zinc-500 transition-colors dark:text-zinc-400 ${
            dragging ? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10" : "border-zinc-200 dark:border-zinc-700"
          }`}
        >
          Drag &amp; drop images here, or <strong>click to browse</strong>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative size-16 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                <img src={p.url} alt={p.file.name} className="size-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                >
                  ×
                </button>
                {i === 0 ? (
                  <span className="absolute bottom-0 left-0 rounded-tr bg-fuchsia-600 px-1 text-[9px] font-semibold text-white">Main</span>
                ) : (
                  <button
                    onClick={() => setAsMainPhoto(p.id)}
                    title="Set as main photo"
                    className="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ★ Set main
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery */}
      <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display text-sm font-semibold">Delivery</h3>

        <label className="flex items-start gap-2 text-xs">
          <input type="radio" name="delivery" checked={isAuto} onChange={() => setDeliveryMethod("Automatic")} className="mt-0.5 accent-fuchsia-500" />
          <span>
            <strong>Automatic</strong> — Eldorado instantly delivers the account details on purchase; you don&apos;t need to be
            online.
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="radio"
            name="delivery"
            checked={!isAuto}
            onChange={() => setDeliveryMethod("Manual")}
            className="mt-0.5 accent-fuchsia-500"
          />
          <span>
            <strong>Manual</strong> — you deliver the account yourself within your guaranteed time.
          </span>
        </label>

        {!isAuto && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Guaranteed Delivery Time</label>
              <Dropdown
                value={manualDeliveryTime}
                onChange={setManualDeliveryTime}
                label="Delivery time"
                ariaLabel="Select guaranteed delivery time"
                fullWidth
                options={MANUAL_DELIVERY_TIMES}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Quantity in stock</label>
              <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
              {errors.quantity && <p className={errCls}>{errors.quantity}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Account information (automatic delivery only) */}
      {isAuto && (
        <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
          <h3 className="font-display text-sm font-semibold">Account Information Shared With Buyer</h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            One entry per account — each is delivered to one buyer, and your stock equals the number of entries. Entries
            seeded from a tracked account auto-fill from your Bulk Accounts pool by matching username; pick from the pool
            yourself, or type details manually. The purchase notice is always appended automatically.
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setShowPicker((v) => !v)}
              type="button"
              className="rounded-lg border border-zinc-200 px-2 py-1 font-medium dark:border-zinc-700"
            >
              {showPicker ? "Hide bulk list" : "Select from Bulk List"}
            </button>
            <button
              onClick={autofillFromBulkAccounts}
              type="button"
              className="rounded-lg border border-zinc-200 px-2 py-1 font-medium dark:border-zinc-700"
            >
              Autofill from Bulk Accounts
            </button>
            <span className="text-zinc-500 dark:text-zinc-400">{bulkAccounts.filter((a) => !a.used).length} available</span>
            <Link to="/eldorado" className="font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
              Manage pool
            </Link>
          </div>

          {showPicker && (
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              {bulkAccounts.filter((a) => !a.used).length === 0 ? (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No available accounts.{" "}
                  <Link to="/eldorado" className="text-fuchsia-600 hover:underline dark:text-fuchsia-400">
                    Add some in Bulk Accounts
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    value={pickerFilter}
                    onChange={(e) => setPickerFilter(e.target.value)}
                    placeholder="Search user…"
                    className={`${inputCls} mb-2`}
                  />
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {availableAccounts.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={picked.has(a.id)} onChange={() => togglePicked(a.id)} className="accent-fuchsia-500" />
                        <span className="font-mono">{a.user}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={addPickedAccounts}
                      disabled={picked.size === 0}
                      type="button"
                      className="gradient-purple rounded-lg px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Add {picked.size || ""} selected
                    </button>
                    <button
                      onClick={() => setPicked(new Set())}
                      type="button"
                      className="rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium dark:border-zinc-700"
                    >
                      Clear selection
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {accounts.map((value, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Account {i + 1}</label>
                {accounts.length > 1 && (
                  <button onClick={() => removeAccount(i)} type="button" className="text-[11px] font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
                    Remove
                  </button>
                )}
              </div>
              <textarea value={value} onChange={(e) => updateAccount(i, e.target.value)} rows={3} placeholder="Type all account details here…" className={inputCls} />
            </div>
          ))}
          {errors.accounts && <p className={errCls}>{errors.accounts}</p>}

          <button onClick={addAccount} type="button" className="text-xs font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
            + Add additional account
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => publish(false)} disabled={busy} className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          Publish
        </button>
        <button
          onClick={() => publish(true)}
          disabled={busy}
          title="Publish and keep shared fields for the next one"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          Publish &amp; New
        </button>
        <button onClick={addToQueue} disabled={busy} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-zinc-700">
          Add to Queue
        </button>
        <button onClick={clearForm} disabled={busy} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 disabled:opacity-50 dark:border-zinc-700">
          Clear
        </button>
      </div>

      {queue.pendingCount > 0 && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {queue.pendingCount} listing(s) waiting in the{" "}
          <Link to="/eldorado" className="font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
            Batch Queue
          </Link>
          .
        </p>
      )}

      {showcaseModalOpen && showcaseAccount && (
        <ShowcaseGeneratorModal
          account={showcaseAccount.account}
          details={showcaseAccount.details}
          actionLabel="Add to photos"
          onAction={useShowcaseAsPhoto}
          onClose={() => setShowcaseModalOpen(false)}
        />
      )}

      {showcaseAccount && (
        <div className="pointer-events-none fixed top-0 -left-[9999px] opacity-0" aria-hidden="true">
          <AccountShowcaseCard
            ref={quickHeroRef}
            account={showcaseAccount.account}
            details={showcaseAccount.details}
            pose={quickHeroConfig.pose}
            visibleStats={quickHeroConfig.visibleStats}
          />
          <UnitsShowcaseCard ref={quickUnitsRef} account={showcaseAccount.account} details={showcaseAccount.details} columns={DEFAULT_UNIT_COLUMNS} />
          <InventoryShowcaseCard
            ref={quickInventoryRef}
            account={showcaseAccount.account}
            details={showcaseAccount.details}
            columns={DEFAULT_ITEM_COLUMNS}
          />
        </div>
      )}
    </div>
  );
}
