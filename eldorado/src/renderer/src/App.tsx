import { useState } from 'react'
import { ToastProvider } from './components/Toast'
import { QueueProvider, useQueue } from './queue'
import { NewListing } from './pages/NewListing'
import { Batch } from './pages/Batch'
import { BulkAccounts } from './pages/BulkAccounts'
import { Settings } from './pages/Settings'

type Page = 'new' | 'batch' | 'bulk' | 'settings'

function Shell(): JSX.Element {
  const [page, setPage] = useState<Page>('new')
  const { items, running } = useQueue()
  const badge = items.filter((i) => i.status !== 'done').length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">E</div>
          <div>
            <div className="name">Auto Lister</div>
            <div className="sub">Eldorado Seller</div>
          </div>
        </div>

        <div className={`nav-item ${page === 'new' ? 'active' : ''}`} onClick={() => setPage('new')}>
          + New Listing
        </div>
        <div
          className={`nav-item ${page === 'batch' ? 'active' : ''}`}
          onClick={() => setPage('batch')}
        >
          <span>Batch Queue</span>
          {(badge > 0 || running) && <span className="nav-badge">{running ? '…' : badge}</span>}
        </div>
        <div
          className={`nav-item ${page === 'bulk' ? 'active' : ''}`}
          onClick={() => setPage('bulk')}
        >
          Bulk Accounts
        </div>
        <div
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => setPage('settings')}
        >
          Settings
        </div>
      </aside>

      <main className="content">
        {page === 'new' && (
          <NewListing
            goToSettings={() => setPage('settings')}
            goToBatch={() => setPage('batch')}
            goToBulk={() => setPage('bulk')}
          />
        )}
        {page === 'batch' && <Batch goToNew={() => setPage('new')} />}
        {page === 'bulk' && <BulkAccounts />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export function App(): JSX.Element {
  return (
    <ToastProvider>
      <QueueProvider>
        <Shell />
      </QueueProvider>
    </ToastProvider>
  )
}
