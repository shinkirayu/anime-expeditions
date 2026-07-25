import { getSettings } from '../settings'
import { getIdToken } from './auth'

/**
 * Thin HTTP client for the Eldorado API.
 *
 * Private endpoints authenticate via a cookie (`__Host-EldoradoIdToken`), NOT a
 * bearer header, and the seller bot must send its assigned User-Agent. Both are
 * applied here. All requests run in the Electron main process, so there are no
 * browser CORS restrictions and these headers can be set freely.
 */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** JSON body (mutually exclusive with `form`). */
  json?: unknown
  /** multipart/form-data body. */
  form?: FormData
  /** When true, attach the auth cookie (signing in if needed). */
  auth?: boolean
  /** Query parameters. */
  query?: Record<string, string | number | boolean | undefined>
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const clean = path.replace(/^\/+/, '')
  const url = new URL(`${baseUrl}/api/${clean}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

async function extractError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `Request failed (HTTP ${res.status}).`
  try {
    const body = JSON.parse(text)
    // Eldorado envelope: { code, messages: [...] }
    if (Array.isArray(body?.messages) && body.messages.length) {
      return body.messages.filter(Boolean).join(' ')
    }
    // ASP.NET ProblemDetails / ModelState style responses.
    if (body?.errors && typeof body.errors === 'object') {
      const msgs = Object.values(body.errors as Record<string, string[]>)
        .flat()
        .filter(Boolean)
      if (msgs.length) return msgs.join(' ')
    }
    return body?.detail || body?.title || body?.message || text
  } catch {
    return text.slice(0, 500)
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const settings = getSettings()
  if (!settings.baseUrl) throw new Error('API Base URL is not set. Configure it in Settings.')

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (settings.userAgent) headers['User-Agent'] = settings.userAgent

  if (options.auth) {
    const token = await getIdToken()
    headers['Cookie'] = `__Host-EldoradoIdToken=${token}`
  }

  let body: BodyInit | undefined
  if (options.form) {
    body = options.form // fetch sets the multipart boundary automatically
  } else if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.json)
  }

  const url = buildUrl(settings.baseUrl, path, options.query)
  const res = await fetch(url, { method: options.method ?? 'GET', headers, body })

  if (!res.ok) throw new ApiError(await extractError(res), res.status)

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
