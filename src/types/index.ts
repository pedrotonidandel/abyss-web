export type ContentCategory = 'movies' | 'series' | 'books' | 'animes'

export type ItemLicense = 'freeware' | 'open_source' | 'demo' | 'public_domain' | 'commercial'

export interface SeriesEpisode {
  title: string
  uri: string
  fileSize?: string
  uploadDate?: string
}

export interface SeriesSeason {
  season: number
  uri?: string   // optional season-pack torrent
  episodes: SeriesEpisode[]
}

export interface DownloadItem {
  title: string
  uris: string[]
  uploadDate: string
  fileSize: string
  category?: ContentCategory
  type?: 'book' | 'movie' | 'serie' | 'anime'
  coverUrl?: string
  tmdbId?: number  // pins the exact TMDB entry — skips title search
  license?: ItemLicense
  seasons?: SeriesSeason[]  // series only — nested episodes per season
}

export interface ApiKeys {
  tmdb?: string
}

// ── Addon manifest ─────────────────────────────────────────────────────────
// What the server stores: only identity metadata, never download content.
// url=null means the addon was loaded from a local file (its DownloadItem[]
// lives in localAddonStore in the client's localStorage).
export interface AddonManifest {
  id:       string
  name:     string
  category: ContentCategory
  url:      string | null
  addedAt:  string
}

// Full in-app source = manifest + downloads fetched/loaded by the client.
export interface Source extends AddonManifest {
  downloads: DownloadItem[]
}

// ── Library item ───────────────────────────────────────────────────────────
// Server shape — only status-tracking fields. No P2P-sensitive data.
// contentKey is a blind identifier (t:<tmdbId>, r:<rawgId>, or SHA-256 hash)
// so the server never stores human-readable titles.
export interface LibraryItemServer {
  id:         string
  contentKey: string
  category:   ContentCategory
  addedAt:    string
  status:     'queued' | 'downloading' | 'completed' | 'paused' | 'error'
  progress:   number
  liked:      boolean
  watched:    boolean
  title:    string
  coverUrl: string | null
}

export interface PublicUserProfile {
  id: number
  username: string
  displayName: string | null
  isAdmin: boolean
  isPrivate: boolean
  preferredTitle: string | null
  isFriend: boolean
  isSelf: boolean
  friendshipId: number | null
  pendingDirection: 'incoming' | 'outgoing' | null
  canSeeFull: boolean
  stats: {
    total: number
    completed: number
    completedMovies: number
    completedSeries: number
    completedBooks: number
    completedAnimes: number
    liked: number
    comments: number
  } | null
  friendCount: number | null
  library: {
    id: string
    contentKey: string
    category: string
    status: string
    liked: boolean
    addedAt: string
  }[] | null
  recentComments: {
    id: number
    contentKey: string
    content: string
    rating: number | null
    createdAt: string
  }[] | null
}

export interface Comment {
  id: number
  userId: number
  username: string                // @handle
  displayName: string              // display name (falls back to username)
  parentId: number | null
  rating: number | null            // 1-5, top-level only
  content: string
  createdAt: string
  likes: number
  dislikes: number
  userVote: 'like' | 'dislike' | null
  contentKey?: string              // present only when fetching by-user (blind key, not title)
  // Legacy fields kept for backwards compatibility during transition
  itemTitle?: string               // kept for UI display in ProfilePage
  itemCategory?: string            // kept for UI display in ProfilePage
}

export interface RecentVisit {
  title: string
  category: ContentCategory
  cover?: string | null
}

export interface User {
  id: number
  username: string
  displayName: string | null
  email: string
  isPrivate: boolean
  isAdmin: boolean
  preferredTitle: string | null
}


// ─── Social ────────────────────────────────────────────────────────────────

export interface FriendUser {
  id: number
  username: string
  displayName: string | null
  isAdmin: boolean
  preferredTitle: string | null
}

export interface FriendRequest {
  id: number
  user: FriendUser
  direction: 'incoming' | 'outgoing'
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  respondedAt: string | null
}

export interface AppNotification {
  id: number
  type: 'friend_request' | 'friend_accepted' | 'download_complete' | 'admin_broadcast' | 'admin_direct' | 'release'
  title: string
  body: string | null
  data: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface AppRelease {
  id: number
  version: string
  title: string
  changelog: string
  createdAt: string
  createdBy: number
  createdByName: string
}

export interface ReleaseComment {
  id: number
  releaseId: number
  userId: number
  username: string
  displayName: string | null
  content: string
  createdAt: string
}

export interface ReleaseReactionGroup {
  emoji: string
  count: number
  userIds: number[]
}

export interface AdminUserSummary {
  id: number
  username: string
  displayName: string | null
  email: string
  isAdmin: boolean
  isPrivate: boolean
  createdAt: string | null
  libraryCount: number
  commentCount: number
}

export interface BugReport {
  id: number
  title: string
  description: string
  category: string
  status: 'aberto' | 'em_analise' | 'resolvido'
  createdAt: string
  username: string
  displayName: string
}
