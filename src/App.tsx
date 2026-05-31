import { useState, useEffect } from 'react'
import { Bell, ChevronDown, UserCircle, Shield, LogOut } from 'lucide-react'
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
import { SourcesPage } from './pages/SourcesPage'
import { SettingsWebPage } from './pages/SettingsWebPage'
import { DetailPage } from './pages/DetailPage'
import type { DownloadItem, Source, User } from './types'

type AppState = 'loading' | 'login' | 'app'
type Page = 'home' | 'browse' | 'library' | 'releases' | 'profile' | 'sources' | 'settings'

export default function App() {
  const [appState, setAppState]     = useState<AppState>('loading')
  const [page, setPage]             = useState<Page>('home')
  const [detailItem, setDetailItem] = useState<{ item: DownloadItem; source: Source } | null>(null)
  const [viewedUserId, setViewedUserId] = useState<number | null>(null)
  const [profileIntent, setProfileIntent] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifItems, setNotifItems] = useState<Array<{id: number; title: string; body: string|null; readAt: string|null; createdAt: string}>>([])
  const [pushGranted, setPushGranted] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission === 'granted' : false))

  const { setUser, setSources, setLibrary, sources, user } = useAppStore()

  const requestPushPermission = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPushGranted(perm === 'granted')
  }

  const fetchNotifs = async () => {
    try {
      const items = await api.notifications.list()
      setNotifItems(items)
    } catch { /* ignore */ }
  }

  const openDetail = (item: DownloadItem, source: Source) => {
    // If the item came from the TMDB catalog (no URIs), try to find a matching addon item in sources
    if (!item.uris?.length && !item.seasons?.length) {
      const itemCategory = item.category ?? source.category
      for (const src of sources) {
        const found = src.downloads.find(
          d => d.title === item.title && (d.category ?? src.category) === itemCategory
        )
        if (found) { setDetailItem({ item: found, source: src }); return }
      }
    }
    setDetailItem({ item, source })
  }

  const openUserProfile = (userId: number) => {
    setViewedUserId(userId)
    setPage('profile')
    setDetailItem(null)
  }

  const navigate = (p: string) => {
    if (p.startsWith('profile:')) {
      setViewedUserId(parseInt(p.slice(8)))
      setPage('profile')
    } else if (p === 'settings-nav') {
      setPage('settings')
      setViewedUserId(null)
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
        const addonUrl = localAddonUrlStore.get(manifest.id) ?? manifest.url ?? null
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
    api.auth.getAvatar().then(setAvatarDataUrl).catch(() => {})
    api.notifications.unreadCount().then(setUnreadCount).catch(() => {})
    api.notifications.markReadByType('download_complete').catch(() => {})
    fetchNotifs()
  }

  const handleLoginSuccess = async (user: User) => { await loadUserData(user) }

  const handleLogout = async () => {
    try { await api.auth.logout() } catch { /* offline */ }
    setSources([]); setLibrary([]); setUser(null); setPage('home'); setAppState('login')
  }

  if (appState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-dvh" style={{ background: 'var(--app-bg)' }}>
        <AbyssLogo size={48} />
        <p className="text-sm mt-3" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
      </div>
    )
  }

  if (appState === 'login') return <LoginPage onSuccess={handleLoginSuccess} />

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--app-bg)' }}>

      {/* ── Sidebar (tablet/desktop only) ── */}
      <div className="hidden md:flex">
        <Sidebar
          activePage={page}
          onNavigate={(p) => { setDetailItem(null); if (p === 'profile') setProfileIntent(null); navigate(p) }}
          onBugReport={() => { setDetailItem(null); setProfileIntent('bug'); navigate('profile') }}
          onSuggestion={() => { setDetailItem(null); setProfileIntent('suggestions'); navigate('profile') }}
        />
      </div>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile wordmark header */}
        {!detailItem && (
          <div
            className="shrink-0 md:hidden flex items-end px-5"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 12,
              minHeight: 48,
              background: 'var(--panel)',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.3px',
                color: '#ffffff',
              }}
            >
              abyss
            </span>
          </div>
        )}

        {/* ── Tablet header: user dropdown + notifications (md only, hidden on home page) ── */}
        {!detailItem && page !== 'home' && (
          <div
            className="hidden md:flex shrink-0 items-end justify-end"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
              minHeight: 52,
              borderBottom: '1px solid var(--divider)',
              gap: 8,
            }}
          >
            {/* Notification bell */}
            <button
              onClick={() => { setNotifOpen(true); fetchNotifs() }}
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--lv-muted)', position: 'relative',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-muted)' }}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--brand-yellow)',
                }} />
              )}
            </button>

            {/* User dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setHeaderProfileOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 10px 5px 6px', borderRadius: 10,
                  border: '1px solid var(--divider)',
                  background: headerProfileOpen ? 'var(--panel-2)' : 'var(--panel)',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'oklch(0.85 0.17 90 / 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--brand-yellow)',
                  }}>
                    {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', margin: 0, whiteSpace: 'nowrap' }}>
                    {user?.displayName ?? user?.username}
                  </p>
                  {user?.isAdmin && (
                    <p style={{ fontSize: 10, color: 'var(--brand-yellow)', margin: 0, fontWeight: 600 }}>Admin</p>
                  )}
                </div>
                <ChevronDown
                  size={13}
                  style={{
                    color: 'var(--lv-muted)', flexShrink: 0,
                    transform: headerProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {headerProfileOpen && (
                <>
                  <div onClick={() => setHeaderProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                    zIndex: 50, background: 'var(--panel)',
                    border: '1px solid var(--divider)', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    overflow: 'hidden', minWidth: 160,
                  }}>
                    <button
                      onClick={() => { setHeaderProfileOpen(false); setDetailItem(null); setProfileIntent(null); navigate('profile') }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--lv-text)', fontSize: 13 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.05)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <UserCircle size={15} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
                      Ver Perfil
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={() => { setHeaderProfileOpen(false); setDetailItem(null); setProfileIntent(null); navigate('profile') }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--lv-text)', fontSize: 13 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.05)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <Shield size={15} style={{ color: 'var(--brand-yellow)', flexShrink: 0 }} />
                        Painel Admin
                      </button>
                    )}
                    <div style={{ height: 1, background: 'var(--divider)', margin: '2px 0' }} />
                    <button
                      onClick={() => { setHeaderProfileOpen(false); handleLogout() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <LogOut size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
              {page === 'home'     && (
                <BrowsePage
                  onOpenDetail={openDetail}
                  avatarDataUrl={avatarDataUrl}
                  unreadCount={unreadCount}
                  onNotifOpen={() => { setNotifOpen(true); fetchNotifs() }}
                  onLogout={handleLogout}
                  onViewProfile={() => { setDetailItem(null); setProfileIntent(null); navigate('profile') }}
                  headerProfileOpen={headerProfileOpen}
                  onHeaderProfileToggle={() => setHeaderProfileOpen(o => !o)}
                />
              )}
              {page === 'browse'   && <HomePage onOpenDetail={openDetail} />}
              {page === 'library'  && (
                <LibraryPage
                  onOpenDetail={openDetail}
                  unreadCount={unreadCount}
                  onNotifOpen={() => { setNotifOpen(true); fetchNotifs() }}
                />
              )}
              {page === 'releases' && <ReleasesPage />}
              {page === 'sources'  && <SourcesPage onBack={() => setPage('home')} />}
              {page === 'settings' && <SettingsWebPage />}
              {page === 'profile'  && (
                <ProfilePage
                  onLogout={handleLogout}
                  viewedUserId={viewedUserId}
                  onNavigate={(p) => { navigate(p) }}
                  initialSubPage={profileIntent ?? undefined}
                  onSubPageChange={() => setProfileIntent(null)}
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
              libraryBadge={unreadCount > 0}
            />
          </div>
        )}
      </div>

      {/* ── Global notification panel (works on any page) ── */}
      {notifOpen && (
        <>
          <div
            onClick={() => setNotifOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 45 }}
          />
          <div style={{
            position: 'fixed', top: 60, right: 16, zIndex: 50,
            width: 320, maxHeight: 480,
            background: 'var(--panel)', border: '1px solid var(--divider)',
            borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--lv-text)' }}>Notificações</span>
              {!pushGranted && (
                <button onClick={requestPushPermission} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 8,
                  background: 'var(--brand-yellow)', color: '#0d111a',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}>
                  Ativar
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifItems.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--lv-muted)', fontSize: 13 }}>
                  Sem notificações
                </p>
              ) : (
                notifItems.map((n) => (
                  <div key={n.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--divider)',
                    background: n.readAt ? 'transparent' : 'oklch(0.85 0.17 90 / 0.05)',
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 2px' }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: 0 }}>{n.body}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
