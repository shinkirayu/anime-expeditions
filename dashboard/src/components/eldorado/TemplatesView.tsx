import { useMemo, useState } from "react";
import { useToast } from "../Toast";
import { Dropdown } from "../Dropdown";
import { useEldoradoGames } from "../../hooks/useEldoradoGames";
import {
  MANUAL_DELIVERY_TIMES,
  PRICE_LIMITS,
  deleteTemplate as deleteTemplateStorage,
  getTemplates,
  saveTemplate as saveTemplateStorage,
} from "../../lib/eldorado";
import type { DeliveryMethod, ListingTemplate } from "../../lib/eldoradoTypes";

/** Standalone manager for saved listing templates (reusable game/price/delivery/description presets). */

const EMPTY_FORM = {
  name: "",
  gameId: "",
  offerTitle: "",
  description: "",
  price: "",
  hasOriginalEmail: false,
  deliveryMethod: "Manual" as DeliveryMethod,
  manualDeliveryTime: "Hour1",
  quantity: "1",
};

export function TemplatesView() {
  const toast = useToast();
  const gamesQuery = useEldoradoGames(true);
  const [templates, setTemplates] = useState<ListingTemplate[]>(() => getTemplates());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const gameName = useMemo(
    () => gamesQuery.data?.find((g) => g.gameId === form.gameId)?.name ?? form.gameId,
    [gamesQuery.data, form.gameId],
  );

  function startNew(): void {
    setEditingName(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(t: ListingTemplate): void {
    setEditingName(t.name);
    setForm({
      name: t.name,
      gameId: t.gameId,
      offerTitle: t.offerTitle,
      description: t.description,
      price: t.price != null ? String(t.price) : "",
      hasOriginalEmail: t.hasOriginalEmail,
      deliveryMethod: t.deliveryMethod,
      manualDeliveryTime: t.manualDeliveryTime,
      quantity: String(t.quantity),
    });
  }

  function handleSave(): void {
    const name = form.name.trim();
    if (!name) return toast.error("Template name is required.");
    const priceNum = Number.parseFloat(form.price);
    try {
      const list = saveTemplateStorage({
        name,
        gameId: form.gameId,
        offerTitle: form.offerTitle,
        description: form.description,
        price: Number.isNaN(priceNum) ? null : priceNum,
        hasOriginalEmail: form.hasOriginalEmail,
        deliveryMethod: form.deliveryMethod,
        manualDeliveryTime: form.manualDeliveryTime,
        quantity: Number.parseInt(form.quantity, 10) || 1,
      });
      setTemplates(list);
      setEditingName(name);
      toast.success("Template saved", name);
    } catch (err) {
      toast.error("Could not save template", err instanceof Error ? err.message : String(err));
    }
  }

  function handleDelete(name: string): void {
    setTemplates(deleteTemplateStorage(name));
    if (editingName === name) startNew();
    toast.info("Template deleted", name);
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-transparent p-2 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700";
  // Native <select> popups render with the select's own background/text color, not the page's —
  // "transparent" leaves them white regardless of dark mode, so selects need an explicit color pair.
  const selectCls =
    "w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  const labelCls = "text-xs font-semibold text-zinc-600 dark:text-zinc-300";
  const isAuto = form.deliveryMethod === "Automatic";

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Reusable presets (game, price, delivery, description boilerplate) for the New Listing form —
        stored in this browser's localStorage.
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
        {templates.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No templates saved yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Title</th>
                <th className="px-2 py-2 font-medium">Price</th>
                <th className="px-2 py-2 font-medium">Delivery</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.name}
                  className={`cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5 ${
                    editingName === t.name ? "bg-fuchsia-50 dark:bg-fuchsia-500/10" : ""
                  }`}
                  onClick={() => startEdit(t)}
                >
                  <td className="px-3 py-1.5 font-semibold">{t.name}</td>
                  <td className="max-w-40 truncate px-2 py-1.5" title={t.offerTitle}>
                    {t.offerTitle || "—"}
                  </td>
                  <td className="px-2 py-1.5">{t.price != null ? `$${t.price.toFixed(2)}` : "—"}</td>
                  <td className="px-2 py-1.5">{t.deliveryMethod}</td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.name);
                      }}
                      className="font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">{editingName ? `Edit "${editingName}"` : "New template"}</h3>
          {editingName && (
            <button onClick={startNew} className="text-[11px] font-medium text-fuchsia-600 hover:underline dark:text-fuchsia-400">
              + New instead
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Template name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Maxed account preset"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Game</label>
            {gamesQuery.isLoading ? (
              <div className={`${selectCls} text-zinc-400 dark:text-zinc-500`}>Loading games…</div>
            ) : (
              <Dropdown
                value={form.gameId}
                onChange={(gameId) => setForm((f) => ({ ...f, gameId }))}
                label="Game"
                ariaLabel="Select game"
                fullWidth
                placeholder="Select a game…"
                options={[
                  ...(gamesQuery.data ?? []).map((g) => ({ value: g.gameId, label: g.name })),
                  ...(form.gameId && !gamesQuery.data?.some((g) => g.gameId === form.gameId)
                    ? [{ value: form.gameId, label: gameName }]
                    : []),
                ]}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Listing title</label>
          <input
            type="text"
            value={form.offerTitle}
            onChange={(e) => setForm((f) => ({ ...f, offerTitle: e.target.value }))}
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={4}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={labelCls}>Price (USD)</label>
            <input
              type="number"
              min={PRICE_LIMITS.minOfferValue}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <label className="mt-5 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.hasOriginalEmail}
              onChange={(e) => setForm((f) => ({ ...f, hasOriginalEmail: e.target.checked }))}
              className="accent-fuchsia-500"
            />
            Original email included
          </label>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Delivery method</label>
          <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            <button
              onClick={() => setForm((f) => ({ ...f, deliveryMethod: "Automatic" }))}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                isAuto ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Automatic
            </button>
            <button
              onClick={() => setForm((f) => ({ ...f, deliveryMethod: "Manual" }))}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                !isAuto ? "gradient-purple text-white" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {!isAuto && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Guaranteed delivery time</label>
              <select
                value={form.manualDeliveryTime}
                onChange={(e) => setForm((f) => ({ ...f, manualDeliveryTime: e.target.value }))}
                className={selectCls}
              >
                {MANUAL_DELIVERY_TIMES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                min={1}
                step={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={handleSave} className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
            {editingName ? "Save changes" : "Save template"}
          </button>
          {editingName && (
            <button
              onClick={() => handleDelete(editingName)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-800 dark:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
