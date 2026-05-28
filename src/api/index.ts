// High-level API surface — what the rest of the app should import.
//
//   import { api } from '@/api'
//   await api.auth.login({ email, password })
//   const library = await api.library.list()
//
// Every method here is a thin typed wrapper around client.request(). The
// shapes match the backend response shapes from abyss-api/src/routes/*.

import { client } from './client'
import type {
  User, AddonManifest, LibraryItemServer,
  PublicUserProfile, FriendUser, FriendRequest, AppNotification,
  AppRelease, AdminUserSummary, BugReport,
  ReleaseComment, ReleaseReactionGroup,
} from '../types'

// ─── Auth ──────────────────────────────────────────────────────────────────

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
}

const auth = {
  /** Register. On success the session is automatically activated. */
  async register(data: { username: string; email: string; password: string }): Promise<User> {
    const r = await client.request<AuthResponse>('POST', '/api/v1/auth/register', data, { skipAuth: true })
    client.setSession(r)
    return r.user
  },

  async login(data: { email: string; password: string }): Promise<User> {
    const r = await client.request<AuthResponse>('POST', '/api/v1/auth/login', data, { skipAuth: true })
    client.setSession(r)
    return r.user
  },

  /** Manually trigger a refresh — typically not needed (auto-refresh on 401). */
  async refresh(): Promise<User | null> {
    const refreshToken = client.getRefreshToken()
    if (!refreshToken) return null
    try {
      const r = await client.request<AuthResponse>(
        'POST', '/api/v1/auth/refresh', { refreshToken },
        { skipAuth: true, skipRefresh: true },
      )
      client.setSession(r)
      return r.user
    } catch {
      client.clearSession()
      return null
    }
  },

  async logout(): Promise<void> {
    const refreshToken = client.getRefreshToken()
    try {
      await client.request<{ ok: true }>('POST', '/api/v1/auth/logout',
        refreshToken ? { refreshToken } : {})
    } catch {
      // Even if the server call fails, drop the local session.
    }
    client.clearSession()
  },

  async me(): Promise<User> {
    return client.request<User>('GET', '/api/v1/auth/me')
  },

  async updateProfile(data: { displayName?: string; username?: string }): Promise<User> {
    return client.request<User>('PATCH', '/api/v1/auth/profile', data)
  },

  /** Auth optional — works on the register page too. */
  async checkUsername(username: string): Promise<{ available: boolean; handle: string }> {
    return client.request('GET', `/api/v1/auth/check-username?username=${encodeURIComponent(username)}`,
      undefined, { skipAuth: !client.isAuthenticated() })
  },

  async changePassword(data: { current: string; next: string }): Promise<void> {
    await client.request<{ ok: true }>('POST', '/api/v1/auth/change-password', data)
  },

  async setPrivacy(isPrivate: boolean): Promise<User> {
    return client.request<User>('PATCH', '/api/v1/auth/privacy', { isPrivate })
  },

  async setPreferredTitle(titleId: string | null): Promise<User> {
    return client.request<User>('PATCH', '/api/v1/auth/preferred-title', { titleId })
  },

  // ── Own avatar ──
  async getAvatar(): Promise<string | null> {
    const r = await client.request<{ dataUrl: string | null }>('GET', '/api/v1/auth/avatar')
    return r.dataUrl
  },

  async saveAvatar(dataUrl: string): Promise<void> {
    await client.request<{ ok: true }>('PUT', '/api/v1/auth/avatar', { dataUrl })
  },

  async deleteAvatar(): Promise<void> {
    await client.request<{ ok: true }>('DELETE', '/api/v1/auth/avatar')
  },

  // ── Session introspection (no roundtrip) ──
  isAuthenticated(): boolean { return client.isAuthenticated() },
  hasRefreshToken(): boolean { return client.hasRefreshToken() },
  onAuthChange: client.onAuthChange.bind(client),
}

// ─── Sources ───────────────────────────────────────────────────────────────
// The server stores only addon manifests (id, name, category, addedAt).
// URL is stored exclusively in localStorage (localAddonUrlStore) — it never
// reaches the server. Actual download content is fetched client-side.

const sources = {
  list(): Promise<AddonManifest[]> {
    return client.request<AddonManifest[]>('GET', '/api/v1/sources')
  },

  async create(manifest: AddonManifest): Promise<void> {
    // Send only identity fields — url is excluded intentionally
    const { id, name, category, addedAt } = manifest
    await client.request<{ ok: true }>('POST', '/api/v1/sources', { id, name, category, addedAt })
  },

  async remove(id: string): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/sources/${encodeURIComponent(id)}`)
  },
}

// ─── Library ───────────────────────────────────────────────────────────────
// Server tracks status/progress/liked only. Magnet URIs and paths stay local.

const library = {
  list(): Promise<LibraryItemServer[]> {
    return client.request<LibraryItemServer[]>('GET', '/api/v1/library')
  },

  async create(item: LibraryItemServer): Promise<void> {
    await client.request<{ ok: true; id: string }>('POST', '/api/v1/library', item)
  },

  async remove(id: string): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/library/${encodeURIComponent(id)}`)
  },

  /** Hot path during a live download — only status and progress are synced. */
  patch(id: string, patch: { status?: LibraryItemServer['status']; progress?: number }): Promise<LibraryItemServer> {
    return client.request<LibraryItemServer>('PATCH', `/api/v1/library/${encodeURIComponent(id)}`, patch)
  },

  async start(id: string): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/library/${encodeURIComponent(id)}/start`)
  },
  async pause(id: string): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/library/${encodeURIComponent(id)}/pause`)
  },
  async stop(id: string): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/library/${encodeURIComponent(id)}/stop`)
  },

  async toggleLike(id: string): Promise<boolean> {
    const r = await client.request<{ liked: boolean }>('POST', `/api/v1/library/${encodeURIComponent(id)}/like`)
    return r.liked
  },

  async toggleWatched(id: string): Promise<boolean> {
    const r = await client.request<{ watched: boolean }>('POST', `/api/v1/library/${encodeURIComponent(id)}/watched`)
    return r.watched
  },
}

// ─── Comments ──────────────────────────────────────────────────────────────

interface Comment {
  id: number; userId: number; username: string; displayName: string
  parentId: number | null; rating: number | null; content: string
  createdAt: string; likes: number; dislikes: number
  userVote: 'like' | 'dislike' | null
}

interface CommentByUser extends Comment {
  contentKey: string
}

const comments = {
  list(contentKey: string): Promise<Comment[]> {
    return client.request<Comment[]>('GET', `/api/v1/comments?contentKey=${encodeURIComponent(contentKey)}`)
  },

  create(data: {
    contentKey: string
    parentId: number | null; rating: number | null; content: string
  }): Promise<Comment> {
    return client.request<Comment>('POST', '/api/v1/comments', data)
  },

  async remove(commentId: number): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/comments/${commentId}`)
  },

  async vote(commentId: number, vote: 'like' | 'dislike' | null): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/comments/${commentId}/vote`, { vote })
  },

  byUser(userId: number): Promise<CommentByUser[]> {
    return client.request<CommentByUser[]>('GET', `/api/v1/comments/by-user/${userId}`)
  },
}

// ─── Friends ───────────────────────────────────────────────────────────────

interface FriendListResponse {
  friends: FriendUser[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

interface FriendSearchResult extends FriendUser {
  relationship: 'pending' | 'accepted' | null
}

const friends = {
  list(): Promise<FriendListResponse> {
    return client.request<FriendListResponse>('GET', '/api/v1/friends')
  },

  search(q: string): Promise<FriendSearchResult[]> {
    return client.request<FriendSearchResult[]>('GET', `/api/v1/friends/search?q=${encodeURIComponent(q)}`)
  },

  request(userId: number): Promise<{ autoAccepted: boolean }> {
    return client.request<{ autoAccepted: boolean }>('POST', '/api/v1/friends/request', { userId })
  },

  respond(friendshipId: number, accept: boolean): Promise<{ ok: true; accepted: boolean }> {
    return client.request('POST', `/api/v1/friends/${friendshipId}/respond`, { accept })
  },

  async remove(userId: number): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/friends/${userId}`)
  },
}

// ─── Users (other people's profiles) ───────────────────────────────────────

const users = {
  getProfile(userId: number): Promise<PublicUserProfile> {
    return client.request<PublicUserProfile>('GET', `/api/v1/users/${userId}/profile`)
  },

  async getAvatar(userId: number): Promise<string | null> {
    const r = await client.request<{ dataUrl: string | null }>('GET', `/api/v1/users/${userId}/avatar`)
    return r.dataUrl
  },
}

// ─── Notifications ─────────────────────────────────────────────────────────

const notifications = {
  list(): Promise<AppNotification[]> {
    return client.request<AppNotification[]>('GET', '/api/v1/notifications')
  },

  async unreadCount(): Promise<number> {
    const r = await client.request<{ count: number }>('GET', '/api/v1/notifications/unread-count')
    return r.count
  },

  async markRead(id: number): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/notifications/${id}/read`)
  },

  async markAllRead(): Promise<number> {
    const r = await client.request<{ ok: true; marked: number }>('POST', '/api/v1/notifications/read-all')
    return r.marked
  },

  async remove(id: number): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/notifications/${id}`)
  },

  async markReadByType(type: string): Promise<void> {
    await client.request<{ ok: true; marked: number }>('POST', '/api/v1/notifications/read-type', { type })
  },
}

// ─── Releases ──────────────────────────────────────────────────────────────

const releases = {
  list(): Promise<AppRelease[]> {
    return client.request<AppRelease[]>('GET', '/api/v1/releases')
  },
  listComments(releaseId: number): Promise<ReleaseComment[]> {
    return client.request<ReleaseComment[]>('GET', `/api/v1/releases/${releaseId}/comments`)
  },
  addComment(releaseId: number, content: string): Promise<ReleaseComment> {
    return client.request<ReleaseComment>('POST', `/api/v1/releases/${releaseId}/comments`, { content })
  },
  async deleteComment(releaseId: number, commentId: number): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/releases/${releaseId}/comments/${commentId}`)
  },
  listReactions(releaseId: number): Promise<ReleaseReactionGroup[]> {
    return client.request<ReleaseReactionGroup[]>('GET', `/api/v1/releases/${releaseId}/reactions`)
  },
  async toggleReaction(releaseId: number, emoji: string): Promise<void> {
    await client.request<{ ok: true }>('POST', `/api/v1/releases/${releaseId}/reactions`, { emoji })
  },
}

// ─── Bugs ──────────────────────────────────────────────────────────────────

const bugs = {
  async submit(data: { title: string; description: string; category: string }): Promise<void> {
    await client.request<{ ok: true }>('POST', '/api/v1/bugs', data)
  },
}

// ─── Admin ─────────────────────────────────────────────────────────────────

const admin = {
  listUsers(): Promise<AdminUserSummary[]> {
    return client.request<AdminUserSummary[]>('GET', '/api/v1/admin/users')
  },

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
    await client.request<{ ok: true }>('PATCH', `/api/v1/admin/users/${userId}/admin`, { isAdmin })
  },

  createRelease(data: { version: string; title: string; changelog: string }): Promise<{ id: number; sentTo: number }> {
    return client.request('POST', '/api/v1/admin/releases', data)
  },

  async deleteRelease(id: number): Promise<void> {
    await client.request<{ ok: true }>('DELETE', `/api/v1/admin/releases/${id}`)
  },

  sendNotification(data: { targetUserId: number | null; title: string; body: string }): Promise<{ sentTo: number }> {
    return client.request('POST', '/api/v1/admin/notifications', data)
  },

  listBugs(): Promise<BugReport[]> {
    return client.request<BugReport[]>('GET', '/api/v1/admin/bugs')
  },

  async updateBug(id: number, status: 'aberto' | 'em_analise' | 'resolvido'): Promise<void> {
    await client.request<{ ok: true; status: string }>('PATCH', `/api/v1/admin/bugs/${id}`, { status })
  },
}

// ─── Health ────────────────────────────────────────────────────────────────

const health = {
  /** Used to verify the backend is reachable before showing the login form. */
  check(): Promise<{ ok: boolean; ts: number; uptimeS?: number; db: { ok: boolean; latencyMs?: number; error?: string } }> {
    return client.request('GET', '/health', undefined, { skipAuth: true })
  },
}

// ─── Compose the single export ─────────────────────────────────────────────

export const api = {
  auth, sources, library, comments, friends, users,
  notifications, releases, bugs, admin, health,
} as const

export type Api = typeof api
export { ApiError } from './errors'
