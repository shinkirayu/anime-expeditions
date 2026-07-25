import { useQueue } from '../queue'
import type { QueueItem } from '../types'

function StatusCell({ item }: { item: QueueItem }): JSX.Element {
  switch (item.status) {
    case 'publishing':
      return (
        <span className="q-status publishing">
          <span className="spinner" /> Publishing…
        </span>
      )
    case 'done':
      return <span className="q-status done">✓ {item.offerId}</span>
    case 'error':
      return (
        <span className="q-status error" title={item.error}>
          ✕ {item.error}
        </span>
      )
    default:
      return <span className="q-status pending">Pending</span>
  }
}

export function Batch({ goToNew }: { goToNew: () => void }): JSX.Element {
  const { items, running, remove, clearDone, clearAll, publishAll } = useQueue()

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'error').length
  const done = items.filter((i) => i.status === 'done').length

  return (
    <div className="container-wide">
      <div className="page-header">
        <h1>Batch Queue</h1>
        <p>
          Queue up listings from the New Listing page, then publish them all in one run. Each row
          shows its own result.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card empty">
          <p>Your queue is empty.</p>
          <button className="btn primary" onClick={goToNew}>
            + Build a listing
          </button>
        </div>
      ) : (
        <>
          <div className="actions" style={{ marginBottom: 16 }}>
            <button className="btn primary" onClick={publishAll} disabled={running || pending === 0}>
              {running && <span className="spinner" />} Publish All ({pending})
            </button>
            <button className="btn ghost" onClick={clearDone} disabled={running || done === 0}>
              Clear published ({done})
            </button>
            <button className="btn ghost" onClick={clearAll} disabled={running}>
              Clear all
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="q-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Delivery</th>
                  <th>Stock</th>
                  <th>Photos</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={item.status}>
                    <td>{item.gameName}</td>
                    <td className="q-title" title={item.offerTitle}>
                      {item.offerTitle}
                    </td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>{item.deliveryMethod === 'Automatic' ? 'Automatic' : 'Manual'}</td>
                    <td>
                      {item.deliveryMethod === 'Automatic'
                        ? item.accounts.filter((a) => a.trim()).length
                        : item.quantity}
                    </td>
                    <td>{item.photos.length}</td>
                    <td>
                      <StatusCell item={item} />
                    </td>
                    <td>
                      {item.status !== 'publishing' && (
                        <button
                          className="link-btn"
                          onClick={() => remove(item.id)}
                          disabled={running}
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
        </>
      )}
    </div>
  )
}
