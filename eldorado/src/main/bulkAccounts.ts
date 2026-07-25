import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { BulkAccount } from './api/types'

/**
 * The bulk pool of `user:pass` credentials used to fill listings.
 *
 * These are real account credentials, so the whole list is encrypted at rest
 * with Electron safeStorage and only decrypted inside the main process.
 */

function filePath(): string {
  return join(app.getPath('userData'), 'bulk-accounts.json')
}

function read(): BulkAccount[] {
  try {
    const raw = JSON.parse(readFileSync(filePath(), 'utf-8')) as { data?: string }
    if (!raw.data) return []
    const json = safeStorage.decryptString(Buffer.from(raw.data, 'base64'))
    const list = JSON.parse(json)
    return Array.isArray(list) ? (list as BulkAccount[]) : []
  } catch {
    return []
  }
}

function write(list: BulkAccount[]): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS secure storage is unavailable; cannot store accounts safely.')
  }
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const data = safeStorage.encryptString(JSON.stringify(list)).toString('base64')
  writeFileSync(filePath(), JSON.stringify({ data }, null, 2), 'utf-8')
}

export function getAccounts(): BulkAccount[] {
  return read()
}

export interface ImportResult {
  accounts: BulkAccount[]
  added: number
  skipped: number
}

/**
 * Parses pasted text of `user:pass` lines (one per line) and appends any new
 * pairs. Splits on the FIRST colon so passwords may contain colons. Blank lines,
 * `#` comments, and duplicates (same user) are skipped.
 */
export function importAccounts(text: string): ImportResult {
  const existing = read()
  const seen = new Set(existing.map((a) => a.user.toLowerCase()))
  let added = 0
  let skipped = 0

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const idx = line.indexOf(':')
    if (idx <= 0 || idx === line.length - 1) {
      skipped++
      continue
    }
    const user = line.slice(0, idx).trim()
    const pass = line.slice(idx + 1).trim()
    if (!user || !pass || seen.has(user.toLowerCase())) {
      skipped++
      continue
    }

    seen.add(user.toLowerCase())
    existing.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      user,
      pass,
      used: false
    })
    added++
  }

  write(existing)
  return { accounts: existing, added, skipped }
}

export function setUsed(ids: string[], used: boolean): BulkAccount[] {
  const set = new Set(ids)
  const list = read().map((a) => (set.has(a.id) ? { ...a, used } : a))
  write(list)
  return list
}

export function removeAccounts(ids: string[]): BulkAccount[] {
  const set = new Set(ids)
  const list = read().filter((a) => !set.has(a.id))
  write(list)
  return list
}

export function clearAccounts(): BulkAccount[] {
  write([])
  return []
}
