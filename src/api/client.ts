// Low-level API client — fetch wrapper + token storage + auto-refresh.
//
// Callers should NOT use this directly; import { api } from './' and use the
// namespaced helpers (api.auth.login, api.library.list, etc.) which return
// typed shapes instead of `unknown`.

import { ApiError } from './errors'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000'

// localStorage keys — namespaced so they don't collide with anything else.
const STORAGE = {
  access:  'abyss.accessToken',
  refresh: 'abyss.refreshToken',
  expiresAt: 'abyss.accessExpiresAt',
} as const

// Listener callbacks for auth state changes — used by App.tsx to react to
// "session expired" without polling.
type AuthListener = (state: 'authenticated' | 'unauthenticated') => void

interface RequestOptions {
  /** Skip Authorization header — for /auth/register, /auth/login, /auth/refresh. */
  skipAuth?: boolean
  /** Skip the auto-refresh-on-401 retry — set internally to prevent loops. */
  skipRefresh?: boolean
  /** Default 'json'. Use 'text' for endpoints that return raw bodies (fetch-url). */
  responseType?: 'json' | 'text'
  /** Override BASE_URL — for external URL fetches that bypass the API. */
  absoluteUrl?: string
}

class ApiClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private accessExpiresAt: number | null = null

  // De-duplicates concurrent refresh attempts — if 3 requests get 401 at the
  // same time, we only call /auth/refresh once and all 3 wait on the same
  // promise.
  private inflightRefresh: Promise<void> | null = null

  private listeners = new Set<AuthListener>()

  constructor() {
    this.loadFromStorage()
  }

  // ── Token lifecycle ────────────────────────────────────────────────────

  private loadFromStorage() {
    try {
      this.accessToken     = localStorage.getItem(STORAGE.access)
      this.refreshToken    = localStorage.getItem(STORAGE.refresh)
      const exp            = localStorage.getItem(STORAGE.expiresAt)
      this.accessExpiresAt = exp ? Number(exp) : null
    } catch {
      // SSR / sandboxed contexts — ignore.
    }
  }

  private saveTokens(tokens: { accessToken: string; refreshToken: string; accessExpiresAt: number }) {
    this.accessToken     = tokens.accessToken
    this.refreshToken    = tokens.refreshToken
    this.accessExpiresAt = tokens.accessExpiresAt
    try {
      localStorage.setItem(STORAGE.access,     tokens.accessToken)
      localStorage.setItem(STORAGE.refresh,    tokens.refreshToken)
      localStorage.setItem(STORAGE.expiresAt,  String(tokens.accessExpiresAt))
    } catch { /* ignore */ }
    this.emit('authenticated')
  }

  private clearTokens() {
    this.accessToken     = null
    this.refreshToken    = null
    this.accessExpiresAt = null
    try {
      localStorage.removeItem(STORAGE.access)
      localStorage.removeItem(STORAGE.refresh)
      localStorage.removeItem(STORAGE.expiresAt)
    } catch { /* ignore */ }
    this.emit('unauthenticated')
  }

  /** True iff we have a token pair AND the access token hasn't expired. */
  isAuthenticated(): boolean {
    if (!this.accessToken || !this.refreshToken) return false
    if (this.accessExpiresAt && Date.now() >= this.accessExpiresAt) return false
    return true
  }

  /** True iff we have a refresh token — even if the access token is expired. */
  hasRefreshToken(): boolean {
    return !!this.refreshToken
  }

  // ── Auth state subscription ────────────────────────────────────────────

  onAuthChange(fn: AuthListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(state: 'authenticated' | 'unauthenticated') {
    for (const fn of this.listeners) {
      try { fn(state) } catch (err) { console.error('[api] auth listener threw:', err) }
    }
  }

  // ── Token setters used by the auth namespace ───────────────────────────

  setSession(tokens: { accessToken: string; refreshToken: string; accessExpiresAt: number }) {
    this.saveTokens(tokens)
  }

  clearSession() {
    this.clearTokens()
  }

  getRefreshToken(): string | null {
    return this.refreshToken
  }

  // ── Core request method ────────────────────────────────────────────────

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = options.absoluteUrl ?? `${BASE_URL}${path}`
    const headers: Record<string, string> = {}

    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json'
    }
    if (!options.skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    let res: Response
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      // Network error / DNS fail / offline — never reach the backend.
      throw new ApiError(0, 'network_error', `Sem conexão com o servidor: ${(err as Error).message}`)
    }

    // ── 401 handling: try one refresh, then retry the original request ──
    if (res.status === 401 && !options.skipAuth && !options.skipRefresh && this.refreshToken) {
      const refreshed = await this.tryRefresh()
      if (refreshed) {
        return this.request<T>(method, path, body, { ...options, skipRefresh: true })
      }
      // Refresh failed — fall through to error parsing below.
    }

    if (!res.ok) {
      // Try to parse the standard error envelope; fall back to status text.
      let code = 'http_error'
      let message = `HTTP ${res.status}: ${res.statusText}`
      let details: unknown = undefined
      try {
        const payload = await res.json() as { error?: string; message?: string; details?: unknown }
        if (payload.error)   code    = payload.error
        if (payload.message) message = payload.message
        if (payload.details !== undefined) details = payload.details
      } catch { /* response wasn't JSON */ }
      throw new ApiError(res.status, code, message, details)
    }

    if (options.responseType === 'text') {
      return (await res.text()) as T
    }

    // 204 No Content (or empty body) → return undefined as T
    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  // ── Refresh logic — de-duped via inflightRefresh ───────────────────────

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false
    if (this.inflightRefresh) {
      // Already refreshing in another concurrent request — wait for it.
      await this.inflightRefresh
      return this.accessToken !== null
    }

    this.inflightRefresh = (async () => {
      try {
        const payload = await this.request<{
          user: unknown
          accessToken: string
          refreshToken: string
          accessExpiresAt: number
        }>(
          'POST',
          '/api/v1/auth/refresh',
          { refreshToken: this.refreshToken },
          { skipAuth: true, skipRefresh: true },
        )
        this.saveTokens({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          accessExpiresAt: payload.accessExpiresAt,
        })
      } catch (err) {
        // Refresh failed → drop the whole session.
        console.warn('[api] refresh failed, clearing session:', err)
        this.clearTokens()
      } finally {
        this.inflightRefresh = null
      }
    })()

    await this.inflightRefresh
    return this.accessToken !== null
  }
}

export const client = new ApiClient()
