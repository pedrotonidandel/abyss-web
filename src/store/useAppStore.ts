import { create } from 'zustand'
import type { Source, LibraryItemServer, ContentCategory, User, RecentVisit } from '../types'
import type { ApiEnrichment } from '../utils/fetchApiData'

interface AppStore {
  user: User | null
  sources: Source[]
  library: LibraryItemServer[]
  activeCategory: ContentCategory
  searchQuery: string
  apiEnrichment: Record<string, ApiEnrichment>
  recentlyVisited: RecentVisit[]

  setUser: (u: User | null) => void
  setSources: (s: Source[]) => void
  /** Patch a single source by id — used when lazy-loading addon content */
  patchSource: (id: string, patch: Partial<Source>) => void
  setLibrary: (l: LibraryItemServer[]) => void
  setActiveCategory: (cat: ContentCategory) => void
  setSearchQuery: (q: string) => void
  setApiEnrichment: (key: string, data: ApiEnrichment) => void
  toggleLikedInStore: (id: string) => void
  toggleWatchedInStore: (id: string) => void
  addRecentlyVisited: (v: RecentVisit) => void
}

export const useAppStore = create<AppStore>()((set) => ({
  user: null,
  sources: [],
  library: [],
  activeCategory: 'movies',
  searchQuery: '',
  apiEnrichment: {},
  recentlyVisited: [],

  setUser: (user) => set((s) => ({ user, recentlyVisited: user?.id !== s.user?.id ? [] : s.recentlyVisited })),
  setSources: (sources) => set({ sources }),
  patchSource: (id, patch) => set((s) => ({
    sources: s.sources.map(src => src.id === id ? { ...src, ...patch } : src),
  })),
  setLibrary: (library) => set({ library }),
  setActiveCategory: (cat) => set({ activeCategory: cat, searchQuery: '' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setApiEnrichment: (key, data) => set((s) => ({ apiEnrichment: { ...s.apiEnrichment, [key]: data } })),
  toggleLikedInStore: (id) => set((s) => ({ library: s.library.map((x) => x.id === id ? { ...x, liked: !x.liked } : x) })),
  toggleWatchedInStore: (id) => set((s) => ({ library: s.library.map((x) => x.id === id ? { ...x, watched: !x.watched } : x) })),
  addRecentlyVisited: (visit) => set((s) => {
    const filtered = s.recentlyVisited.filter((v) => !(v.title === visit.title && v.category === visit.category))
    return { recentlyVisited: [visit, ...filtered].slice(0, 5) }
  }),
}))
