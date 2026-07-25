import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { useQueue } from '../queue'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { ACCEPTED_IMAGE_TYPES, MANUAL_DELIVERY_TIMES, PRICE_LIMITS } from '../constants'
import { ensureWarning, formatAccountBlob } from '../format'
import type { EncodedPhoto, ListingDraft } from '../types'

interface GameOption {
  gameId: string
  name: string
  seoAlias: string
  isPopular: boolean
}

interface Photo {
  id: string
  file: File
  url: string
}

type DeliveryMethod = 'Automatic' | 'Manual'

interface Props {
  goToSettings: () => void
  goToBatch: () => void
  goToBulk: () => void
}

export function NewListing({ goToSettings, goToBatch, goToBulk }: Props): JSX.Element {
  const toast = useToast()
  const queue = useQueue()

  const [games, setGames] = useState<GameOption[]>([])
  const [gamesError, setGamesError] = useState<string | null>(null)
  const [loadingGames, setLoadingGames] = useState(true)

  const [gameId, setGameId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalEmail, setOriginalEmail] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('Automatic')
  const [manualDeliveryTime, setManualDeliveryTime] = useState('Hour1')
  const [quantity, setQuantity] = useState('1')
  const [accounts, setAccounts] = useState<string[]>([''])

  const [bulkAccounts, setBulkAccounts] = useState<BulkAccountView[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pickerFilter, setPickerFilter] = useState('')

  const [templates, setTemplates] = useState<ListingTemplateView[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [publishStep, setPublishStep] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      setLoadingGames(true)
      const [gamesRes, tplRes, bulkRes] = await Promise.all([
        window.eldorado.listGames(),
        window.eldorado.listTemplates(),
        window.eldorado.listBulkAccounts()
      ])
      if (gamesRes.ok && gamesRes.data) setGames(gamesRes.data)
      else setGamesError(gamesRes.error || 'Failed to load games.')
      if (tplRes.ok && tplRes.data) setTemplates(tplRes.data)
      if (bulkRes.ok && bulkRes.data) setBulkAccounts(bulkRes.data)
      setLoadingGames(false)
    })()
  }, [])

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  const priceNum = useMemo(() => Number.parseFloat(price), [price])
  const isAuto = deliveryMethod === 'Automatic'
  const gameName = games.find((g) => g.gameId === gameId)?.name || gameId

  function addFiles(files: FileList | File[]): void {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (Array.from(files).length - incoming.length > 0)
      toast.info('Some files skipped', 'Only image files can be added.')
    setPhotos((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        url: URL.createObjectURL(file)
      }))
    ])
  }

  function removePhoto(id: string): void {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  // ---- bulk account picker ----
  const availableAccounts = useMemo(
    () =>
      bulkAccounts
        .filter((a) => !a.used)
        .filter((a) =>
          pickerFilter.trim()
            ? a.user.toLowerCase().includes(pickerFilter.trim().toLowerCase())
            : true
        ),
    [bulkAccounts, pickerFilter]
  )

  function togglePicked(id: string): void {
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  /** Turns the picked credentials into formatted account entries. */
  async function addPickedAccounts(): Promise<void> {
    const chosen = bulkAccounts.filter((a) => picked.has(a.id))
    if (chosen.length === 0) return
    const blobs = chosen.map((a) => formatAccountBlob(a.user, a.pass))

    setAccounts((prev) => {
      const kept = prev.filter((a) => a.trim().length > 0)
      return [...kept, ...blobs]
    })

    // Mark them used so the same credentials aren't listed twice.
    const res = await window.eldorado.setBulkAccountsUsed({ ids: [...picked], used: true })
    if (res.ok && res.data) setBulkAccounts(res.data)

    setPicked(new Set())
    setShowPicker(false)
    toast.success(
      `Added ${chosen.length} account(s)`,
      'Marked as used in Bulk Accounts so they are not reused.'
    )
  }

  function updateAccount(i: number, value: string): void {
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? value : a)))
  }
  function addAccount(): void {
    setAccounts((prev) => [...prev, ''])
  }
  function removeAccount(i: number): void {
    setAccounts((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!gameId) e.gameId = 'Select a game.'
    if (!title.trim()) e.title = 'Listing title is required.'
    if (!description.trim()) e.description = 'Description is required.'
    if (!price.trim() || Number.isNaN(priceNum)) e.price = 'Enter a price.'
    else if (priceNum < PRICE_LIMITS.minOfferValue)
      e.price = `Minimum offer value is $${PRICE_LIMITS.minOfferValue.toFixed(2)}.`
    else if (priceNum > PRICE_LIMITS.maxUnitPrice)
      e.price = `Maximum price is $${PRICE_LIMITS.maxUnitPrice}.`

    if (isAuto) {
      if (accounts.every((a) => !a.trim()))
        e.accounts = 'Automatic delivery needs at least one account filled in.'
    } else {
      const q = Number.parseInt(quantity, 10)
      if (Number.isNaN(q) || q < 1) e.quantity = 'Quantity must be at least 1.'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /** Clears only the per-listing fields, keeping shared ones for fast repeat entry. */
  function resetUnique(): void {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    setTitle('')
    setAccounts([''])
    setPhotos([])
    setErrors({})
  }

  function clearForm(): void {
    resetUnique()
    setGameId('')
    setDescription('')
    setPrice('')
    setOriginalEmail(false)
    setDeliveryMethod('Automatic')
    setManualDeliveryTime('Hour1')
    setQuantity('1')
    setSelectedTemplate('')
  }

  async function encodePhotos(): Promise<EncodedPhoto[]> {
    return Promise.all(
      photos.map(async (p) => ({
        name: p.file.name,
        mimeType: p.file.type,
        bytes: new Uint8Array(await p.file.arrayBuffer())
      }))
    )
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
      // Every entry carries the standard purchase notice, even hand-typed ones.
      accounts: accounts.map(ensureWarning),
      manualDeliveryTime,
      quantity: Number.parseInt(quantity, 10) || 1,
      photos: encoded
    }
  }

  async function publish(keepShared: boolean): Promise<void> {
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      return
    }
    try {
      setPublishStep(photos.length > 0 ? `Uploading ${photos.length} photo(s)…` : 'Creating listing…')
      const encoded = await encodePhotos()
      setPublishStep('Publishing listing…')
      const res = await window.eldorado.publishListing(buildDraft(encoded))
      if (res.ok && res.data) {
        toast.success(
          'Listing published',
          `Offer ${res.data.offerId} created with ${res.data.uploadedImages} image(s).`
        )
        keepShared ? resetUnique() : clearForm()
      } else {
        toast.error('Publish failed', res.error)
      }
    } catch (err) {
      toast.error('Publish failed', err instanceof Error ? err.message : String(err))
    } finally {
      setPublishStep(null)
    }
  }

  async function addToQueue(): Promise<void> {
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setPublishStep('Preparing photos…')
    try {
      const encoded = await encodePhotos()
      queue.add(buildDraft(encoded))
      toast.success('Added to batch queue', 'Publish it from the Batch Queue tab.')
      resetUnique()
    } finally {
      setPublishStep(null)
    }
  }

  // ---- templates ----
  function applyTemplate(name: string): void {
    setSelectedTemplate(name)
    const t = templates.find((x) => x.name === name)
    if (!t) return
    setGameId(t.gameId)
    setTitle(t.offerTitle)
    setDescription(t.description)
    setPrice(t.price != null ? String(t.price) : '')
    setOriginalEmail(t.hasOriginalEmail)
    setDeliveryMethod(t.deliveryMethod)
    setManualDeliveryTime(t.manualDeliveryTime)
    setQuantity(String(t.quantity))
    toast.info('Template loaded', name)
  }

  async function saveTemplate(): Promise<void> {
    const name = templateName.trim()
    if (!name) return toast.error('Enter a template name')
    const res = await window.eldorado.saveTemplate({
      name,
      gameId,
      offerTitle: title,
      description,
      price: Number.isNaN(priceNum) ? null : priceNum,
      hasOriginalEmail: originalEmail,
      deliveryMethod,
      manualDeliveryTime,
      quantity: Number.parseInt(quantity, 10) || 1
    })
    if (res.ok && res.data) {
      setTemplates(res.data)
      setSelectedTemplate(name)
      setSavingTemplate(false)
      setTemplateName('')
      toast.success('Template saved', name)
    } else toast.error('Could not save template', res.error)
  }

  async function deleteTemplate(): Promise<void> {
    if (!selectedTemplate) return
    const res = await window.eldorado.deleteTemplate(selectedTemplate)
    if (res.ok && res.data) {
      setTemplates(res.data)
      setSelectedTemplate('')
      toast.info('Template deleted')
    }
  }

  const busy = publishStep !== null

  return (
    <div className="container">
      {busy && <LoadingOverlay step={publishStep!} />}

      <div className="page-header">
        <h1>New Listing</h1>
        <p>Create and publish an account offer to Eldorado.</p>
      </div>

      {/* --- Template bar --- */}
      <div className="template-bar">
        <label>Template</label>
        <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)}>
          <option value="">— none —</option>
          {templates.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        {savingTemplate ? (
          <>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              style={{ maxWidth: 180 }}
              autoFocus
            />
            <button className="btn small" onClick={saveTemplate}>
              Save
            </button>
            <button className="btn ghost small" onClick={() => setSavingTemplate(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn small" onClick={() => setSavingTemplate(true)}>
              Save as…
            </button>
            <button className="btn ghost small" onClick={deleteTemplate} disabled={!selectedTemplate}>
              Delete
            </button>
          </>
        )}
      </div>

      {/* --- Offer details --- */}
      <div className="card">
        <h2>Offer Details</h2>
        <p className="card-hint">The core information buyers will see.</p>

        <div className="field">
          <label>Game Title<span className="req">*</span></label>
          {gamesError ? (
            <div className="error-text">
              {gamesError} Check your <a onClick={goToSettings}>Settings</a>.
            </div>
          ) : (
            <select
              className={errors.gameId ? 'invalid' : ''}
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              disabled={loadingGames}
            >
              <option value="">{loadingGames ? 'Loading games…' : 'Select a game…'}</option>
              {games.map((g) => (
                <option key={g.gameId} value={g.gameId}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          {errors.gameId && <div className="error-text">{errors.gameId}</div>}
        </div>

        <div className="field">
          <label>Listing Title<span className="req">*</span></label>
          <input
            className={errors.title ? 'invalid' : ''}
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Maxed account, rare skins, original email"
          />
          {errors.title && <div className="error-text">{errors.title}</div>}
        </div>

        <div className="field">
          <label>Description<span className="req">*</span></label>
          <textarea
            className={errors.description ? 'invalid' : ''}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the account: level, items, rank, bindings, etc."
          />
          {errors.description && <div className="error-text">{errors.description}</div>}
        </div>

        <div className="field" style={{ maxWidth: 220 }}>
          <label>Price (USD)<span className="req">*</span></label>
          <input
            className={errors.price ? 'invalid' : ''}
            type="number"
            min={PRICE_LIMITS.minOfferValue}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
          {errors.price && <div className="error-text">{errors.price}</div>}
        </div>

        <div className="field">
          <label className="toggle">
            <input
              type="checkbox"
              checked={originalEmail}
              onChange={(e) => setOriginalEmail(e.target.checked)}
            />
            <span className="track" />
            <span>Original email included</span>
          </label>
        </div>
      </div>

      {/* --- Photos --- */}
      <div className="card">
        <h2>Photos</h2>
        <p className="card-hint">The first photo becomes the main offer image.</p>

        <div
          className={`dropzone ${dragging ? 'drag' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
        >
          Drag &amp; drop images here, or <strong>click to browse</strong>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {photos.length > 0 && (
          <div className="thumbs">
            {photos.map((p, i) => (
              <div className="thumb" key={p.id}>
                <img src={p.url} alt={p.file.name} />
                <button onClick={() => removePhoto(p.id)} title="Remove">
                  ×
                </button>
                {i === 0 && <span className="main-badge">Main</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Delivery --- */}
      <div className="card">
        <h2>Delivery</h2>
        <p className="card-hint">How the buyer receives the account.</p>

        <div className="field">
          <label className="radio-row">
            <input
              type="radio"
              name="delivery"
              checked={deliveryMethod === 'Automatic'}
              onChange={() => setDeliveryMethod('Automatic')}
            />
            <span>
              <strong>Automatic</strong> — Eldorado instantly delivers the account details on
              purchase; you don&apos;t need to be online.
            </span>
          </label>
          <label className="radio-row">
            <input
              type="radio"
              name="delivery"
              checked={deliveryMethod === 'Manual'}
              onChange={() => setDeliveryMethod('Manual')}
            />
            <span>
              <strong>Manual</strong> — you deliver the account yourself within your guaranteed
              time.
            </span>
          </label>
        </div>

        {!isAuto && (
          <div className="row">
            <div className="field">
              <label>Guaranteed Delivery Time<span className="req">*</span></label>
              <select
                value={manualDeliveryTime}
                onChange={(e) => setManualDeliveryTime(e.target.value)}
              >
                {MANUAL_DELIVERY_TIMES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Quantity in stock<span className="req">*</span></label>
              <input
                className={errors.quantity ? 'invalid' : ''}
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity && <div className="error-text">{errors.quantity}</div>}
            </div>
          </div>
        )}
      </div>

      {/* --- Account information (automatic delivery only) --- */}
      {isAuto && (
        <div className="card">
          <h2>Account Information Shared With Buyer</h2>
          <p className="card-hint">
            One entry per account — each is delivered to one buyer, and your stock equals the number
            of entries. Pick from your credential pool, or type details manually. The purchase
            notice is always appended automatically.
          </p>

          <div className="picker-bar">
            <button className="btn small" onClick={() => setShowPicker((v) => !v)} type="button">
              {showPicker ? 'Hide bulk list' : 'Select from Bulk List'}
            </button>
            <span className="muted">
              {bulkAccounts.filter((a) => !a.used).length} available
            </span>
            <button className="link-btn" onClick={goToBulk} type="button">
              Manage pool
            </button>
          </div>

          {showPicker && (
            <div className="picker">
              {bulkAccounts.filter((a) => !a.used).length === 0 ? (
                <div className="empty" style={{ padding: 18 }}>
                  No available accounts.{' '}
                  <a onClick={goToBulk}>Add some in Bulk Accounts</a>.
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={pickerFilter}
                    onChange={(e) => setPickerFilter(e.target.value)}
                    placeholder="Search user…"
                    style={{ marginBottom: 10 }}
                  />
                  <div className="picker-list">
                    {availableAccounts.map((a) => (
                      <label className="picker-row" key={a.id}>
                        <input
                          type="checkbox"
                          checked={picked.has(a.id)}
                          onChange={() => togglePicked(a.id)}
                        />
                        <span className="mono">{a.user}</span>
                      </label>
                    ))}
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}>
                    <button
                      className="btn primary small"
                      onClick={addPickedAccounts}
                      disabled={picked.size === 0}
                      type="button"
                    >
                      Add {picked.size || ''} selected
                    </button>
                    <button
                      className="btn ghost small"
                      onClick={() => setPicked(new Set())}
                      type="button"
                    >
                      Clear selection
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {accounts.map((value, i) => (
            <div className="field" key={i}>
              <div className="account-head">
                <label style={{ margin: 0 }}>Account {i + 1}</label>
                {accounts.length > 1 && (
                  <button className="link-btn" onClick={() => removeAccount(i)} type="button">
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={value}
                onChange={(e) => updateAccount(i, e.target.value)}
                placeholder="Type all account details here…"
              />
            </div>
          ))}
          {errors.accounts && <div className="error-text">{errors.accounts}</div>}

          <button className="link-btn" onClick={addAccount} type="button" style={{ marginTop: 6 }}>
            + Add additional account
          </button>
        </div>
      )}

      <div className="actions">
        <button className="btn primary" onClick={() => publish(false)} disabled={busy}>
          {busy && <span className="spinner" />} Publish
        </button>
        <button className="btn" onClick={() => publish(true)} disabled={busy} title="Publish and keep shared fields for the next one">
          Publish &amp; New
        </button>
        <button className="btn" onClick={addToQueue} disabled={busy}>
          Add to Queue
        </button>
        <button className="btn ghost" onClick={clearForm} disabled={busy}>
          Clear
        </button>
      </div>

      {queue.pendingCount > 0 && (
        <div className="inline-note">
          {queue.pendingCount} listing(s) waiting in the{' '}
          <a onClick={goToBatch}>Batch Queue</a>.
        </div>
      )}
    </div>
  )
}
