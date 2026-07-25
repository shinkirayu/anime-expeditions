import { apiRequest } from './client'
import type { GameOption, LibraryEntry } from './types'

/**
 * Fetches the public game catalog and returns only the games that support
 * Account offers, de-duplicated by gameId and sorted (popular first, then name).
 */
export async function getAccountGames(): Promise<GameOption[]> {
  const library = await apiRequest<LibraryEntry[]>('library', { query: { locale: 'en-US' } })

  const byId = new Map<string, GameOption>()
  for (const row of library) {
    if (row.category !== 'Account') continue
    if (byId.has(row.gameId)) continue
    byId.set(row.gameId, {
      gameId: row.gameId,
      name: row.gameName || row.menuGameTitle,
      seoAlias: row.seoAlias,
      isPopular: row.isPopularGame
    })
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
