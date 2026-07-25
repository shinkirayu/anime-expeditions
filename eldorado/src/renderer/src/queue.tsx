import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ListingDraft, QueueItem } from './types'

interface QueueApi {
  items: QueueItem[]
  /** Number of items not yet successfully published. */
  pendingCount: number
  /** True while a Publish-All run is in progress. */
  running: boolean
  add: (draft: ListingDraft) => void
  remove: (id: string) => void
  clearDone: () => void
  clearAll: () => void
  publishAll: () => Promise<void>
}

const QueueContext = createContext<QueueApi | null>(null)

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function QueueProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<QueueItem[]>([])
  const [running, setRunning] = useState(false)

  const add = useCallback((draft: ListingDraft) => {
    setItems((prev) => [...prev, { ...draft, id: newId(), status: 'pending' }])
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearDone = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== 'done'))
  }, [])

  const clearAll = useCallback(() => setItems([]), [])

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)))
  }, [])

  const publishAll = useCallback(async () => {
    setRunning(true)
    try {
      // Snapshot ids to publish (pending or previously errored), in order.
      const toRun = items.filter((i) => i.status === 'pending' || i.status === 'error')
      for (const item of toRun) {
        patch(item.id, { status: 'publishing', error: undefined })
        const res = await window.eldorado.publishListing({
          gameId: item.gameId,
          offerTitle: item.offerTitle,
          description: item.description,
          price: item.price,
          hasOriginalEmail: item.hasOriginalEmail,
          photos: item.photos,
          deliveryMethod: item.deliveryMethod,
          accounts: item.accounts,
          manualDeliveryTime: item.manualDeliveryTime,
          quantity: item.quantity
        })
        if (res.ok && res.data) {
          patch(item.id, { status: 'done', offerId: res.data.offerId })
        } else {
          patch(item.id, { status: 'error', error: res.error || 'Unknown error' })
        }
      }
    } finally {
      setRunning(false)
    }
  }, [items, patch])

  const pendingCount = useMemo(
    () => items.filter((i) => i.status !== 'done').length,
    [items]
  )

  const api: QueueApi = { items, pendingCount, running, add, remove, clearDone, clearAll, publishAll }
  return <QueueContext.Provider value={api}>{children}</QueueContext.Provider>
}

export function useQueue(): QueueApi {
  const ctx = useContext(QueueContext)
  if (!ctx) throw new Error('useQueue must be used within QueueProvider')
  return ctx
}
