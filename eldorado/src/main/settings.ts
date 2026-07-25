import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AuthMode, Settings } from './api/types'

/**
 * JSON-file settings store in the app's userData directory.
 * Secrets (pasted token, password) are encrypted at rest with Electron
 * safeStorage and only decrypted inside the main process — never sent to the
 * renderer.
 */

interface StoredSettings {
  baseUrl: string
  userAgent: string
  authMode: AuthMode
  email: string
  /** Token mode: base64 safeStorage-encrypted IdToken. */
  encryptedToken: string
  /** Token mode: epoch seconds the token expires. */
  tokenExpiresAt: number
  /** Password mode: base64 safeStorage-encrypted password. */
  encryptedPassword: string
}

const DEFAULTS: StoredSettings = {
  baseUrl: 'https://www.eldorado.gg',
  userAgent: '',
  authMode: 'token',
  email: '',
  encryptedToken: '',
  tokenExpiresAt: 0,
  encryptedPassword: ''
}

function filePath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function read(): StoredSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(readFileSync(filePath(), 'utf-8')) as Partial<StoredSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

function write(data: StoredSettings): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath(), JSON.stringify(data, null, 2), 'utf-8')
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable; cannot store credentials securely.')
  }
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(b64: string): string {
  if (!b64) return ''
  try {
    return safeStorage.decryptString(Buffer.from(b64, 'base64'))
  } catch {
    return ''
  }
}

/** Public settings for the renderer (no secrets). */
export function getSettings(): Settings {
  const s = read()
  const now = Math.floor(Date.now() / 1000)
  const signedIn =
    s.authMode === 'token'
      ? s.encryptedToken.length > 0 && s.tokenExpiresAt > now
      : s.email.length > 0 && s.encryptedPassword.length > 0
  return {
    baseUrl: s.baseUrl,
    userAgent: s.userAgent,
    authMode: s.authMode,
    email: s.email,
    signedIn,
    tokenExpiresAt: s.authMode === 'token' && s.tokenExpiresAt > 0 ? s.tokenExpiresAt : null
  }
}

export interface ConnectionUpdate {
  baseUrl: string
  userAgent: string
}

export function saveConnection(update: ConnectionUpdate): Settings {
  const current = read()
  write({
    ...current,
    baseUrl: update.baseUrl.trim().replace(/\/+$/, '') || DEFAULTS.baseUrl,
    userAgent: update.userAgent.trim()
  })
  return getSettings()
}

export function setAuthMode(mode: AuthMode): Settings {
  write({ ...read(), authMode: mode })
  return getSettings()
}

/** Token mode: store a pasted IdToken with its parsed email + expiry. */
export function setTokenAuth(token: string, email: string, expiresAt: number): Settings {
  write({
    ...read(),
    authMode: 'token',
    email,
    encryptedToken: encrypt(token),
    tokenExpiresAt: expiresAt
  })
  return getSettings()
}

/** Password mode: store email + password for headless SRP sign-in. */
export function setPasswordAuth(email: string, password: string): Settings {
  write({
    ...read(),
    authMode: 'password',
    email: email.trim(),
    encryptedPassword: encrypt(password)
  })
  return getSettings()
}

export function getStoredToken(): string {
  return decrypt(read().encryptedToken)
}

export function getPassword(): string {
  return decrypt(read().encryptedPassword)
}

/** Clears credentials for the current mode (sign out). */
export function clearAuth(): Settings {
  write({ ...read(), encryptedToken: '', tokenExpiresAt: 0, encryptedPassword: '' })
  return getSettings()
}
