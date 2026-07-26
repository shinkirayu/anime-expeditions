import { useMemo, useRef, useState } from "react";
import { useToast } from "../Toast";
import { Dropdown } from "../Dropdown";
import { ShowcaseGeneratorModal } from "../ShowcaseGeneratorModal";
import { publishZeusXListing } from "../../lib/zeusx";
import { markAccountsListed } from "../../lib/listedAccounts";
import { ZEUSX_CATEGORIES } from "../../lib/zeusxTypes";
import type { ZeusXAttribute } from "../../lib/zeusxTypes";
import type { AccountDetailsRow, AccountRow } from "../../lib/types";

interface Photo {
  file: File;
  url: string;
}

interface Props {
  initialTitle?: string;
  initialDescription?: string;
  showcaseAccount?: { account: AccountRow; details: AccountDetailsRow | null | undefined };
  /** Accounts this listing represents — marked "listed" (Units tab tag) once publish succeeds. */
  listingUserIds?: number[];
}

const CUSTOM_LABEL = "Custom…";

function textToAttrs(text: string): ZeusXAttribute[] {
  const out: ZeusXAttribute[] = [];
  for (const part of text.split(",")) {
    const trimmed = part.trim();
    const idx = trimmed.indexOf("=");
    if (trimmed && idx > 0) {
      out.push({ baseAttributeId: trimmed.slice(0, idx).trim(), baseAttributeValue: trimmed.slice(idx + 1).trim() });
    }
  }
  return out;
}

export function NewZeusXListingView({ initialTitle, initialDescription, showcaseAccount, listingUserIds }: Props) {
  const toast = useToast();
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);

  const [categoryLabel, setCategoryLabel] = useState(ZEUSX_CATEGORIES[0].label);
  const [categoryId, setCategoryId] = useState(ZEUSX_CATEGORIES[0].categoryId);
  const [categoryBaseId, setCategoryBaseId] = useState(ZEUSX_CATEGORIES[0].baseId);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [price, setPrice] = useState("");
  const [attributesText, setAttributesText] = useState("");
  const [days, setDays] = useState("");
  const [hours, setHours] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("COORDINATED");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isCustomCategory = categoryLabel === CUSTOM_LABEL;
  const categoryOptions = useMemo(
    () => [...ZEUSX_CATEGORIES.map((c) => ({ value: c.label, label: c.label })), { value: CUSTOM_LABEL, label: CUSTOM_LABEL }],
    [],
  );

  function onSelectCategory(label: string) {
    setCategoryLabel(label);
    const found = ZEUSX_CATEGORIES.find((c) => c.label === label);
    if (found) {
      setCategoryId(found.categoryId);
      setCategoryBaseId(found.baseId);
    }
  }

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  async function useShowcaseAsPhoto(dataUrl: string, filename: string) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      onPickFile(file);
      setShowcaseModalOpen(false);
      toast.success("Photo added", "The showcase image was set as the listing photo.");
    } catch (err) {
      toast.error("Could not add photo", err instanceof Error ? err.message : String(err));
    }
  }

  async function publish() {
    if (!title.trim()) return toast.error("Title is required.");
    if (!price.trim()) return toast.error("Price is required.");
    if (!categoryId.trim() || !categoryBaseId.trim()) return toast.error("Category ID and Base ID are required.");

    setPublishing(true);
    setResult(null);
    try {
      const photoInput = photo ? { name: photo.file.name, mimeType: photo.file.type, bytes: new Uint8Array(await photo.file.arrayBuffer()) } : null;
      const res = await publishZeusXListing({
        title: title.trim(),
        description,
        price: price.trim(),
        categoryId: categoryId.trim(),
        categoryBaseId: categoryBaseId.trim(),
        deliveryMethod: deliveryMethod.trim() || "COORDINATED",
        attributes: textToAttrs(attributesText),
        days,
        hours,
        quantity,
        photo: photoInput,
      });
      setResult(res.offerId ? `Offer ${res.offerId} created.` : "Listing published.");
      toast.success("Listing published");
      if (listingUserIds?.length) markAccountsListed(listingUserIds, "zeusx");
    } catch (err) {
      toast.error("Publish failed", err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";

  return (
    <div className="space-y-4">
      {result && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {result}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <h3 className="font-display text-sm font-semibold">Offer Details</h3>

        <div className="space-y-1.5">
          <label className={labelCls}>Category</label>
          <Dropdown value={categoryLabel} onChange={onSelectCategory} label="Category" ariaLabel="Select category" fullWidth options={categoryOptions} />
        </div>

        {isCustomCategory && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Category ID</label>
              <input type="text" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Base ID</label>
              <input type="text" value={categoryBaseId} onChange={(e) => setCategoryBaseId(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className={labelCls}>Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Price</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Delivery method</label>
            <input type="text" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Attributes (id=value, id=value)</label>
          <input type="text" value={attributesText} onChange={(e) => setAttributesText(e.target.value)} placeholder="84=2347, 83=2334" className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Days (duration only)</label>
            <input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Hours (duration only)</label>
            <input type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Quantity (&gt;1 = multi-stock)</label>
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold">Photo</h3>
          {showcaseAccount && (
            <button onClick={() => setShowcaseModalOpen(true)} type="button" className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium dark:border-zinc-700">
              Use account showcase
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Only photo categories need one — leave blank for duration items.</p>

        {photo ? (
          <div className="relative inline-block size-20 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
            <img src={photo.url} alt={photo.file.name} className="size-full object-cover" />
            <button
              onClick={() => {
                URL.revokeObjectURL(photo.url);
                setPhoto(null);
              }}
              className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
            >
              ×
            </button>
          </div>
        ) : (
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
              onPickFile(e.dataTransfer.files?.[0]);
            }}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-xs text-zinc-500 transition-colors dark:text-zinc-400 ${
              dragging ? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10" : "border-zinc-200 dark:border-zinc-700"
            }`}
          >
            Drag &amp; drop an image here, or <strong>click to browse</strong>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      <button
        onClick={publish}
        disabled={publishing}
        className="gradient-purple w-full rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-[0_0_14px_rgba(129,19,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {publishing ? "Publishing…" : "Publish listing"}
      </button>

      {showcaseModalOpen && showcaseAccount && (
        <ShowcaseGeneratorModal
          account={showcaseAccount.account}
          details={showcaseAccount.details}
          actionLabel="Use as photo"
          onAction={useShowcaseAsPhoto}
          onClose={() => setShowcaseModalOpen(false)}
        />
      )}
    </div>
  );
}
