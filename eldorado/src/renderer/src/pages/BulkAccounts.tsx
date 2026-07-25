import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast'

export function BulkAccounts(): JSX.Element {
  const toast = useToast()

  const [accounts, setAccounts] = useState<BulkAccountView[]>([])
  const [paste, setPaste] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(): Promise<void> {
    const res = await window.eldorado.listBulkAccounts()
    if (res.ok && res.data) setAccounts(res.data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? accounts.filter((a) => a.user.toLowerCase().includes(q)) : accounts
  }, [accounts, filter])

  const available = accounts.filter((a) => !a.used).length

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllVisible(): void {
    setSelected((prev) => {
      const allSelected = visible.every((a) => prev.has(a.id))
      const next = new Set(prev)
      visible.forEach((a) => (allSelected ? next.delete(a.id) : next.add(a.id)))
      return next
    })
  }

  async function importPaste(): Promise<void> {
    if (!paste.trim()) return toast.error('Paste some accounts first')
    setBusy(true)
    try {
      const res = await window.eldorado.importBulkAccounts(paste)
      if (res.ok && res.data) {
        setAccounts(res.data.accounts)
        setPaste('')
        toast.success(
          `Imported ${res.data.added} account(s)`,
          res.data.skipped ? `${res.data.skipped} skipped (duplicate or malformed)` : undefined
        )
      } else toast.error('Import failed', res.error)
    } finally {
      setBusy(false)
    }
  }

  async function mark(used: boolean): Promise<void> {
    if (selected.size === 0) return
    const res = await window.eldorado.setBulkAccountsUsed({ ids: [...selected], used })
    if (res.ok && res.data) {
      setAccounts(res.data)
      setSelected(new Set())
      toast.info(used ? 'Marked as used' : 'Marked as available')
    }
  }

  async function removeSelected(): Promise<void> {
    if (selected.size === 0) return
    const res = await window.eldorado.removeBulkAccounts([...selected])
    if (res.ok && res.data) {
      setAccounts(res.data)
      setSelected(new Set())
      toast.info('Removed')
    }
  }

  async function clearAll(): Promise<void> {
    const res = await window.eldorado.clearBulkAccounts()
    if (res.ok && res.data) {
      setAccounts(res.data)
      setSelected(new Set())
      toast.info('Cleared all accounts')
    }
  }

  return (
    <div className="container-wide">
      <div className="page-header">
        <h1>Bulk Accounts</h1>
        <p>
          Your credential pool. Paste <code>user:pass</code> lines here, then pick from this pool
          when building a listing.
        </p>
      </div>

      <div className="card">
        <h2>Import</h2>
        <p className="card-hint">
          One per line, e.g. <code>myuser:mypassword</code>. Passwords may contain colons (only the
          first colon splits). Blank lines and <code>#</code> comments are ignored; duplicate
          usernames are skipped.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={'user1:pass1\nuser2:pass2\nuser3:pass3'}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: 12.5, minHeight: 130 }}
        />
        <div className="actions">
          <button className="btn primary" onClick={importPaste} disabled={busy}>
            {busy && <span className="spinner" />} Import
          </button>
          <button className="btn ghost" onClick={() => setPaste('')} disabled={busy}>
            Clear box
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="bulk-toolbar">
          <div className="bulk-stats">
            <span className="badge ok">{available} available</span>
            <span className="badge">{accounts.length - available} used</span>
            <span className="badge">{accounts.length} total</span>
          </div>
          <div className="bulk-tools">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search user…"
              style={{ maxWidth: 180 }}
            />
            <label className="toggle-sm">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Show passwords
            </label>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="empty" style={{ padding: 32 }}>
            No accounts yet — paste some above.
          </div>
        ) : (
          <>
            <table className="q-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((a) => selected.has(a.id))}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th>User</th>
                  <th>Password</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className={a.used ? 'done' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                      />
                    </td>
                    <td className="mono">{a.user}</td>
                    <td className="mono">{showPasswords ? a.pass : '••••••••'}</td>
                    <td>
                      {a.used ? (
                        <span className="q-status done">Used</span>
                      ) : (
                        <span className="q-status pending">Available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bulk-footer">
              <span className="muted">{selected.size} selected</span>
              <button className="btn small" onClick={() => mark(false)} disabled={!selected.size}>
                Mark available
              </button>
              <button className="btn small" onClick={() => mark(true)} disabled={!selected.size}>
                Mark used
              </button>
              <button
                className="btn ghost small"
                onClick={removeSelected}
                disabled={!selected.size}
              >
                Remove
              </button>
              <button className="btn ghost small" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
