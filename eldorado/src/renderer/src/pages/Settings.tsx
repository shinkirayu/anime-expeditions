import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'

function expiryLabel(exp: number | null): string {
  if (!exp) return ''
  const secs = exp - Math.floor(Date.now() / 1000)
  if (secs <= 0) return 'expired'
  const m = Math.floor(secs / 60)
  if (m < 60) return `expires in ${m}m`
  return `expires in ${Math.floor(m / 60)}h ${m % 60}m`
}

export function Settings(): JSX.Element {
  const toast = useToast()

  const [baseUrl, setBaseUrl] = useState('https://www.eldorado.gg')
  const [userAgent, setUserAgent] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('token')
  const [email, setEmail] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null)

  // form-only inputs (never populated from stored secrets)
  const [tokenInput, setTokenInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')

  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  function apply(data?: SettingsView): void {
    if (!data) return
    setBaseUrl(data.baseUrl)
    setUserAgent(data.userAgent)
    setAuthMode(data.authMode)
    setEmail(data.email)
    setSignedIn(data.signedIn)
    setTokenExpiresAt(data.tokenExpiresAt)
    setEmailInput((prev) => prev || data.email)
  }

  useEffect(() => {
    void (async () => {
      const res = await window.eldorado.getSettings()
      if (res.ok) apply(res.data)
      setLoaded(true)
    })()
  }, [])

  async function saveConnection(): Promise<void> {
    setBusy(true)
    try {
      const res = await window.eldorado.saveConnection({ baseUrl, userAgent })
      if (res.ok) {
        apply(res.data)
        toast.success('Connection settings saved')
      } else toast.error('Could not save', res.error)
    } finally {
      setBusy(false)
    }
  }

  async function switchMode(mode: AuthMode): Promise<void> {
    const res = await window.eldorado.setAuthMode(mode)
    if (res.ok) apply(res.data)
  }

  async function saveToken(): Promise<void> {
    if (!tokenInput.trim()) return toast.error('Paste your token first')
    setBusy(true)
    try {
      const res = await window.eldorado.setToken(tokenInput.trim())
      if (res.ok) {
        apply(res.data)
        setTokenInput('')
        toast.success('Token saved', res.data?.email)
      } else toast.error('Token rejected', res.error)
    } finally {
      setBusy(false)
    }
  }

  async function savePassword(): Promise<void> {
    if (!emailInput.trim() || !passwordInput) return toast.error('Enter email and password')
    setBusy(true)
    try {
      const res = await window.eldorado.setPassword({
        email: emailInput.trim(),
        password: passwordInput
      })
      if (res.ok) {
        apply(res.data)
        setPasswordInput('')
        toast.success('Credentials verified and saved')
      } else toast.error('Sign-in failed', res.error)
    } finally {
      setBusy(false)
    }
  }

  async function signOut(): Promise<void> {
    const res = await window.eldorado.signOut()
    if (res.ok) {
      apply(res.data)
      toast.info('Signed out')
    }
  }

  async function testConnection(): Promise<void> {
    setTesting(true)
    try {
      const res = await window.eldorado.testConnection()
      if (res.ok) toast.success('Connection successful', res.data)
      else toast.error('Connection failed', res.error)
    } finally {
      setTesting(false)
    }
  }

  if (!loaded) return <div className="container">Loading…</div>

  return (
    <div className="container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Authentication and connection details for the Eldorado Seller API.</p>
      </div>

      <div className="card">
        <h2>Authentication</h2>
        <p className="card-hint">
          Choose how the app signs in. Secrets are encrypted on this device and never leave the
          main process.
        </p>

        <div className="segmented">
          <button
            className={`seg-btn ${authMode === 'token' ? 'active' : ''}`}
            onClick={() => switchMode('token')}
          >
            Session Token
          </button>
          <button
            className={`seg-btn ${authMode === 'password' ? 'active' : ''}`}
            onClick={() => switchMode('password')}
          >
            Email + Password
          </button>
        </div>

        <div className="field">
          <label>Status</label>
          {signedIn ? (
            <span className="badge ok">
              ● Active{email ? ` — ${email}` : ''}
              {authMode === 'token' && tokenExpiresAt ? ` (${expiryLabel(tokenExpiresAt)})` : ''}
            </span>
          ) : (
            <span className="badge warn">● Not authenticated</span>
          )}
        </div>

        {authMode === 'token' ? (
          <>
            <div className="field">
              <label>Session Token (IdToken)</label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste the __Host-EldoradoIdToken value here"
                spellCheck={false}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <div className="hint">
                Log into eldorado.gg in your normal browser, then open DevTools (F12) →{' '}
                <strong>Application ▸ Cookies ▸ https://www.eldorado.gg</strong>, copy the value of{' '}
                <code>__Host-EldoradoIdToken</code>, and paste it above. It expires ~hourly — repeat
                when the status shows expired.
              </div>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={saveToken} disabled={busy}>
                {busy && <span className="spinner" />} Save Token
              </button>
              {signedIn && (
                <button className="btn ghost" onClick={signOut} disabled={busy}>
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Account Email</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seller@example.com"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={signedIn ? '•••••••• (saved — leave blank to keep)' : 'Account password'}
                autoComplete="off"
              />
              <div className="hint">
                Headless sign-in straight to AWS Cognito — no browser, no Cloudflare. Requires an
                email+password credential on your account (ask api@eldorado.gg if you only use
                Google).
              </div>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={savePassword} disabled={busy}>
                {busy && <span className="spinner" />} Save &amp; Verify
              </button>
              {signedIn && (
                <button className="btn ghost" onClick={signOut} disabled={busy}>
                  Clear
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Connection</h2>
        <p className="card-hint">Normally you only need to set the User-Agent.</p>

        <div className="field">
          <label>API Base URL<span className="req">*</span></label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://www.eldorado.gg"
          />
        </div>

        <div className="field">
          <label>User-Agent<span className="req">*</span></label>
          <input
            type="text"
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            placeholder="Your assigned seller-bot User-Agent"
          />
          <div className="hint">
            The unique User-Agent Eldorado assigned to your bot. Required for authorized API access.
          </div>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={saveConnection} disabled={busy || testing}>
            {busy && <span className="spinner" />} Save
          </button>
          <button
            className="btn"
            onClick={testConnection}
            disabled={busy || testing || !signedIn}
            title={signedIn ? '' : 'Authenticate first'}
          >
            {testing && <span className="spinner" />} Test Connection
          </button>
        </div>
      </div>
    </div>
  )
}
