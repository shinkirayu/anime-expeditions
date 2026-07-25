import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ListingTemplate } from './api/types'

/**
 * Named New-Listing presets, persisted as JSON in the app's userData directory.
 * Templates hold only the reusable fields (game, price, delivery, description
 * boilerplate) — never per-listing photos or account text.
 */

function filePath(): string {
  return join(app.getPath('userData'), 'templates.json')
}

function read(): ListingTemplate[] {
  try {
    const data = JSON.parse(readFileSync(filePath(), 'utf-8'))
    return Array.isArray(data) ? (data as ListingTemplate[]) : []
  } catch {
    return []
  }
}

function write(list: ListingTemplate[]): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath(), JSON.stringify(list, null, 2), 'utf-8')
}

export function getTemplates(): ListingTemplate[] {
  return read().sort((a, b) => a.name.localeCompare(b.name))
}

/** Adds or replaces a template by (case-insensitive) name. Returns the full list. */
export function saveTemplate(template: ListingTemplate): ListingTemplate[] {
  const name = template.name.trim()
  if (!name) throw new Error('Template name is required.')
  const list = read().filter((t) => t.name.toLowerCase() !== name.toLowerCase())
  list.push({ ...template, name })
  write(list)
  return getTemplates()
}

export function deleteTemplate(name: string): ListingTemplate[] {
  write(read().filter((t) => t.name.toLowerCase() !== name.toLowerCase()))
  return getTemplates()
}
