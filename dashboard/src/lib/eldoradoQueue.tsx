import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { publishListing } from "./eldorado";
import type { ListingDraft, QueueItem } from "./eldoradoTypes";

/** Batch queue for Eldorado listings — port of eldorado/src/renderer/src/queue.tsx. */
interface QueueApi {
  items: QueueItem[];
  /** Number of items not yet successfully published. */
  pendingCount: number;
  /** True while a Publish-All run is in progress. */
  running: boolean;
  add: (draft: ListingDraft) => void;
  remove: (id: string) => void;
  clearDone: () => void;
  clearAll: () => void;
  publishAll: () => Promise<void>;
}

const QueueContext = createContext<QueueApi | null>(null);

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EldoradoQueueProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);

  const add = useCallback((draft: ListingDraft) => {
    setItems((prev) => [...prev, { ...draft, id: newId(), status: "pending" }]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== "done"));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, []);

  const publishAll = useCallback(async () => {
    setRunning(true);
    try {
      // Snapshot ids to publish (pending or previously errored), in order.
      const toRun = items.filter((i) => i.status === "pending" || i.status === "error");
      for (const item of toRun) {
        patch(item.id, { status: "publishing", error: undefined });
        try {
          const res = await publishListing({
            gameId: item.gameId,
            offerTitle: item.offerTitle,
            description: item.description,
            price: item.price,
            hasOriginalEmail: item.hasOriginalEmail,
            photos: item.photos,
            deliveryMethod: item.deliveryMethod,
            accounts: item.accounts,
            manualDeliveryTime: item.manualDeliveryTime,
            quantity: item.quantity,
          });
          patch(item.id, { status: "done", offerId: res.offerId });
        } catch (err) {
          patch(item.id, { status: "error", error: err instanceof Error ? err.message : "Unknown error" });
        }
      }
    } finally {
      setRunning(false);
    }
  }, [items, patch]);

  const pendingCount = useMemo(() => items.filter((i) => i.status !== "done").length, [items]);

  const api: QueueApi = { items, pendingCount, running, add, remove, clearDone, clearAll, publishAll };
  return <QueueContext.Provider value={api}>{children}</QueueContext.Provider>;
}

export function useEldoradoQueue(): QueueApi {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useEldoradoQueue must be used within EldoradoQueueProvider");
  return ctx;
}
