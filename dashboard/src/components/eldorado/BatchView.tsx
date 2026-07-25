import { useEldoradoQueue } from "../../lib/eldoradoQueue";
import type { QueueItem } from "../../lib/eldoradoTypes";

/** Port of eldorado/src/renderer/src/pages/Batch.tsx. */

function StatusCell({ item }: { item: QueueItem }) {
  switch (item.status) {
    case "publishing":
      return <span className="text-fuchsia-600 dark:text-fuchsia-400">Publishing…</span>;
    case "done":
      return <span className="text-emerald-600 dark:text-emerald-400">✓ {item.offerId}</span>;
    case "error":
      return (
        <span className="text-red-600 dark:text-red-400" title={item.error}>
          ✕ {item.error}
        </span>
      );
    default:
      return <span className="text-zinc-500 dark:text-zinc-400">Pending</span>;
  }
}

export function BatchView({ onGoToNew }: { onGoToNew: () => void }) {
  const { items, running, remove, clearDone, clearAll, publishAll } = useEldoradoQueue();

  const pending = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const done = items.filter((i) => i.status === "done").length;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 p-8 text-center dark:border-white/10">
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Your queue is empty.</p>
        <button onClick={onGoToNew} className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
          + Build a listing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={publishAll}
          disabled={running || pending === 0}
          className="gradient-purple rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {running ? "Publishing…" : `Publish All (${pending})`}
        </button>
        <button
          onClick={clearDone}
          disabled={running || done === 0}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-zinc-700"
        >
          Clear published ({done})
        </button>
        <button
          onClick={clearAll}
          disabled={running}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-zinc-700"
        >
          Clear all
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-2 py-2 font-medium">Game</th>
              <th className="px-2 py-2 font-medium">Title</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Delivery</th>
              <th className="px-2 py-2 font-medium">Stock</th>
              <th className="px-2 py-2 font-medium">Photos</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 last:border-0 dark:border-white/5">
                <td className="px-2 py-1.5">{item.gameName}</td>
                <td className="max-w-40 truncate px-2 py-1.5" title={item.offerTitle}>
                  {item.offerTitle}
                </td>
                <td className="px-2 py-1.5">${item.price.toFixed(2)}</td>
                <td className="px-2 py-1.5">{item.deliveryMethod}</td>
                <td className="px-2 py-1.5">
                  {item.deliveryMethod === "Automatic" ? item.accounts.filter((a) => a.trim()).length : item.quantity}
                </td>
                <td className="px-2 py-1.5">{item.photos.length}</td>
                <td className="px-2 py-1.5">
                  <StatusCell item={item} />
                </td>
                <td className="px-2 py-1.5">
                  {item.status !== "publishing" && (
                    <button
                      onClick={() => remove(item.id)}
                      disabled={running}
                      className="font-medium text-fuchsia-600 hover:underline disabled:opacity-40 dark:text-fuchsia-400"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
