import { useState, useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { api } from './api'
import { localAddonUrlStore, localAddonStore } from './utils/localStore'
import { BottomNav } from './components/layout/BottomNav'
import { Sidebar } from './components/layout/Sidebar'
import { AbyssLogo } from './components/ui/AbyssLogo'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { LibraryPage } from './pages/LibraryPage'
import { ReleasesPage } from './pages/ReleasesPage'
import { ProfilePage } from './pages/ProfilePage'
import { DetailPage } from './pages/DetailPage'
import type { DownloadItem, Source, User } from './types'

type AppState = 'loading' | 'login' | 'app'
type Page = 'home' | 'browse' | 'library' | 'releases' | 'profile'

export default function App() {
  const [appState, setAppState]     = useState<AppState>('loading')
  const [page, setPage]             = useState<Page>('home')
  const [detailItem, setDetailItem] = useState<{ item: DownloadItem; source: Source } | null>(null)
  const [viewedUserId, setViewedUserId] = useState<number | null>(null)
  const [unreadCount, setUnreadCount]   = useState(0)

  const { setUser, setSources, setLibrary } = useAppStore()

  const openDetail = (item: DownloadItem, source: Source) => setDetailItem({ item, source })

  const openUserProfile = (userId: number) => {
    setViewedUserId(userId)
    setPage('profile')
    setDetailItem(null)
  }

  const navigate = (p: string) => {
    if (p.startsWith('profile:')) {
      setViewedUserId(parseInt(p.slice(8)))
      setPage('profile')
    } else {
      setPage(p as Page)
      setViewedUserId(null)
    }
  }

  useEffect(() => {
    ;(window as unknown as { openUserProfile?: (id: number) => void }).openUserProfile = openUserProfile
    return () => { delete (window as unknown as { openUserProfile?: (id: number) => void }).openUserProfile }
  }, [])

  useEffect(() => {
    const off = api.auth.onAuthChange((state) => {
      if (state === 'unauthenticated' && appState === 'app') {
        setSources([]); setLibrary([]); setUser(null); setPage('home'); setAppState('login')
      }
    })
    return off
  }, [appState])

  useEffect(() => { init() }, [])

  const init = async () => {
    const user = await api.auth.refresh()
    if (!user) { setAppState('login'); return }
    await loadUserData(user)
  }

  const loadUserData = async (user: User) => {
    setUser(user)
    const [manifests, serverItems] = await Promise.all([api.sources.list(), api.library.list()])
    const sources: Source[] = await Promise.all(
      manifests.map(async (manifest) => {
        const addonUrl = localAddonUrlStore.get(manifest.id) ?? null
        if (addonUrl) {
          try {
            const res = await fetch(addonUrl)
            const data = await res.json() as { downloads?: DownloadItem[] }
            return { ...manifest, url: addonUrl, downloads: Array.isArray(data.downloads) ? data.downloads : [] }
          } catch { return { ...manifest, url: addonUrl, downloads: [] } }
        }
        return { ...manifest, url: null, downloads: localAddonStore.get(manifest.id) ?? [] }
      }),
    )
    setSources(sources)
    setLibrary(serverItems)
    setAppState('app')
    api.notifications.unreadCount().then(setUnreadCount).catch(() => {})
    api.notifications.markReadByType('download_complete').catch(() => {})
  }

  const handleLoginSuccess = async (user: User) => { await loadUserData(user) }

  const handleLogout = async () => {
    try { await api.auth.logout() } catch { /* offline */ }
    setSources([]); setLibrary([]); setUser(null); setPage('home'); setAppState('login')
  }

  if (appState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-dvh" style={{ background: '#0d0d0d' }}>
        <AbyssLogo size={48} />
        <p className="text-sm mt-3" style={{ color: '#555' }}>Carregando…</p>
      </div>
    )
  }

  if (appState === 'login') return <LoginPage onSuccess={handleLoginSuccess} />

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* ── Sidebar (tablet/desktop only) ── */}
      <div className="hidden md:flex">
        <Sidebar
          activePage={page}
          onNavigate={(p) => { setDetailItem(null); navigate(p) }}
          unreadCount={unreadCount}
        />
      </div>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Page content */}
        <main className="flex-1 overflow-hidden relative">
          {detailItem ? (
            <DetailPage
              item={detailItem.item}
              source={detailItem.source}
              onClose={() => setDetailItem(null)}
            />
          ) : (
            <>
              {page === 'home'     && <HomePage onOpenDetail={openDetail} />}
              {page === 'browse'   && <BrowsePage onOpenDetail={openDetail} />}
              {page === 'library'  && <LibraryPage onOpenDetail={openDetail} />}
              {page === 'releases' && <ReleasesPage />}
              {page === 'profile'  && (
                <ProfilePage
                  onLogout={handleLogout}
                  viewedUserId={viewedUserId}
                  onNavigate={(p) => { navigate(p) }}
                />
              )}
            </>
          )}
        </main>

        {/* ── Bottom nav (mobile only) ── */}
        {!detailItem && (
          <div className="block md:hidden">
            <BottomNav
              activePage={page}
              onNavigate={(p) => { navigate(p) }}
              unreadCount={unreadCount}
            />
          </div>
        )}
      </div>
    </div>
  )
}
