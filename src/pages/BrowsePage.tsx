import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, X, Film, Tv, Sparkles, Star, Bell, ChevronDown, UserCircle, Shield, LogOut } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { fetchCatalogPage, fetchCatalogSearch } from '../utils/fetchApiData'
import type { CatalogItem, CatalogListType } from '../utils/fetchApiData'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'movies', label: 'Filmes',  icon: Film     },
  { id: 'series', label: 'Séries',  icon: Tv       },
  { id: 'animes', label: 'Animes',  icon: Sparkles },
]

const LIST_TYPES: { id: CatalogListType; label: string }[] = [
  { id: 'popular',      label: 'Popular'          },
  { id: 'trending',     label: 'Em Alta'          },
  { id: 'top_rated',    label: 'Mais Avaliados'   },
  { id: 'new_releases', label: 'Novos'            },
]

interface Props {
  onOpenDetail: (item: DownloadItem, source: Source) => void
  externalQuery?: string
  // Tablet header controls (bell + user dropdown embedded in search row)
  avatarDataUrl?: string | null
  unreadCount?: number
  onNotifOpen?: () => void
  onLogout?: () => void
  onViewProfile?: () => void
  headerProfileOpen?: boolean
  onHeaderProfileToggle?: () => void
}

function toStub(item: CatalogItem): { item: DownloadItem; source: Source } {
  return {
    item: {
      title: item.title,
      uris: [],
      uploadDate: item.releaseDate ?? '',
      fileSize: '',
      category: item.category,
      coverUrl: item.cover ?? undefined,
      tmdbId: item.id,
    },
    source: {
      id: `browse-${item.category}`,
      name: 'Catálogo',
      category: item.category,
      url: null,
      addedAt: new Date().toISOString(),
      downloads: [],
    },
  }
}

export function BrowsePage({
  onOpenDetail,
  avatarDataUrl,
  unreadCount = 0,
  onNotifOpen,
  onLogout,
  onViewProfile,
  headerProfileOpen = false,
  onHeaderProfileToggle,
}: Props) {
  const { user } = useAppStore()
  const [category, setCategory]       = useState<ContentCategory>('movies')
  const [listType, setListType]       = useState<CatalogListType>('popular')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery]             = useState('')
  const [items, setItems]             = useState<CatalogItem[]>([])
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [loading, setLoading]         = useState(false)
  const [filterOpen, setFilterOpen]   = useState(false)
  const filterBtnRef                  = useRef<HTMLDivElement>(null)

  // Independent banner items — always the 6 most recent across all categories
  const [bannerItems, setBannerItems] = useState<CatalogItem[]>([])
  const [bannerIdx, setBannerIdx]     = useState(0)

  useEffect(() => {
    // Fetch 6 new-release movies for the banner (independent of category filter)
    fetchCatalogPage('movies', 1, 'new_releases')
      .then(r => setBannerItems(r.items.slice(0, 6)))
      .catch(() => {})
  }, [])

  // Auto-advance banner
  useEffect(() => {
    if (bannerItems.length <= 1) return
    const t = setInterval(() => setBannerIdx(i => (i + 1) % bannerItems.length), 5000)
    return () => clearInterval(t)
  }, [bannerItems.length])

  const bannerItem = bannerItems[bannerIdx] ?? null

  const load = useCallback(async (cat: ContentCategory, lt: CatalogListType, q: string, p: number) => {
    setLoading(true)
    try {
      const result = q
        ? await fetchCatalogSearch(cat, q, p)
        : await fetchCatalogPage(cat, p, lt)
      setItems((prev) => p === 1 ? result.items : [...prev, ...result.items])
      setTotalPages(result.totalPages)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    setPage(1)
    load(category, listType, query, 1)
  }, [category, listType, query, load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(searchInput.trim())
  }

  const handleItemClick = (item: CatalogItem) => {
    const { item: stub, source } = toStub(item)
    onOpenDetail(stub, source)
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(category, listType, query, next)
  }

  return (
    <>
      <style>{`
        .browse-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (min-width: 768px) {
          .browse-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .browse-grid { grid-template-columns: repeat(5, 1fr); }
        }
      `}</style>

      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>

        {/* ── Search row: search bar + bell + user dropdown (bell/user only on md+) ── */}
        <div
          className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          {/* Search bar — flex-1, slightly constrained */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 rounded-xl px-3"
            style={{
              flex: 1, height: 38, maxWidth: 460,
              background: 'var(--panel-2)', border: '1px solid var(--divider)',
            }}
          >
            <Search size={14} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Buscar filmes, séries…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--lv-text)', minWidth: 0 }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setQuery('') }}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} style={{ color: 'var(--lv-muted)' }} />
              </button>
            )}
          </form>

          {/* Bell — tablet/desktop only */}
          <button
            className="hidden md:flex items-center justify-center shrink-0"
            onClick={onNotifOpen}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
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

          {/* User dropdown — tablet/desktop only */}
          <div className="hidden md:block shrink-0" style={{ position: 'relative' }}>
            <button
              onClick={onHeaderProfileToggle}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 6px', borderRadius: 10,
                border: '1px solid var(--divider)',
                background: headerProfileOpen ? 'var(--panel-2)' : 'var(--panel)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'oklch(0.85 0.17 90 / 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--brand-yellow)',
                }}>
                  {(user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', whiteSpace: 'nowrap' }}>
                {user?.displayName ?? user?.username}
              </span>
              <ChevronDown
                size={12}
                style={{
                  color: 'var(--lv-muted)', flexShrink: 0,
                  transform: headerProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {headerProfileOpen && (
              <>
                <div onClick={onHeaderProfileToggle} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                  zIndex: 50, background: 'var(--panel)',
                  border: '1px solid var(--divider)', borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden', minWidth: 160,
                }}>
                  <button
                    onClick={() => { onHeaderProfileToggle?.(); onViewProfile?.() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--lv-text)', fontSize: 13 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.05)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <UserCircle size={15} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
                    Ver Perfil
                  </button>
                  {user?.isAdmin && (
                    <button
                      onClick={() => { onHeaderProfileToggle?.(); onViewProfile?.() }}
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
                    onClick={() => { onHeaderProfileToggle?.(); onLogout?.() }}
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

        {/* ── Category pills + filter button ── */}
        <div className="shrink-0 px-4 pt-2 pb-2 flex items-center gap-2">
          {/* Category pills */}
          <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setCategory(id); setQuery(''); setSearchInput('') }}
                className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background: category === id ? 'var(--brand-yellow)' : 'var(--chip)',
                  color:      category === id ? '#0d111a'              : 'var(--lv-muted)',
                  border:     category === id ? 'none'                 : '1px solid var(--divider)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filter button */}
          <div ref={filterBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: 36, height: 36,
                background: filterOpen ? 'var(--panel-2)' : 'var(--chip)',
                border: '1px solid var(--divider)',
                color: filterOpen ? 'var(--lv-text)' : 'var(--lv-muted)',
              }}
              onClick={() => setFilterOpen(v => !v)}
            >
              <SlidersHorizontal size={16} />
            </button>

            {/* ── Filter popover / bottom-sheet ── */}
            {filterOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 md:bg-transparent"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(1px)' }}
                  onClick={() => setFilterOpen(false)}
                />
                <style>{`
                  .filter-sheet {
                    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
                    display: flex; flex-direction: column;
                    background: var(--panel); border: 1px solid var(--divider);
                    border-radius: 20px 20px 0 0; max-height: 80vh;
                  }
                  @media (min-width: 768px) {
                    .filter-sheet {
                      position: absolute; bottom: auto; left: auto; right: 0; top: calc(100% + 4px);
                      width: 280px; border-radius: 12px; max-height: 320px;
                      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    }
                  }
                `}</style>
                <div className="filter-sheet">
                  <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="rounded-full" style={{ width: 36, height: 4, background: 'oklch(0.35 0.012 235)' }} />
                  </div>
                  <div className="flex items-center justify-between px-5 pt-3 pb-3">
                    <h3 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Filtros</h3>
                    <button onClick={() => setFilterOpen(false)} style={{ color: 'var(--lv-muted)' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="overflow-y-auto px-5 pb-6 flex flex-col gap-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--lv-muted)' }}>Ordenar por</p>
                      <div className="flex flex-wrap gap-2">
                        {LIST_TYPES.map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setListType(id)}
                            className="px-4 py-1.5 rounded-full text-sm font-medium"
                            style={{
                              background: listType === id ? 'var(--brand-yellow)' : 'var(--chip)',
                              color:      listType === id ? '#0d111a'              : 'var(--lv-muted)',
                              border:     listType === id ? 'none'                 : '1px solid var(--divider)',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      className="w-full py-3.5 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
                      onClick={() => setFilterOpen(false)}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="pb-8">

            {/* ── Independent banner — always shown, independent of filter ── */}
              {bannerItem && (
                <div className="px-4 pt-3">
                  <div style={{ position: 'relative' }}>
                    <button
                      className="relative w-full overflow-hidden active:scale-[0.99] transition-transform"
                      style={{ borderRadius: 16, aspectRatio: '16/9' }}
                      onClick={() => handleItemClick(bannerItem)}
                    >
                      {(bannerItem.backdrop ?? bannerItem.cover) ? (
                        <img
                          key={bannerItem.id}
                          src={bannerItem.backdrop ?? bannerItem.cover!}
                          alt={bannerItem.title}
                          className="w-full h-full object-cover"
                          loading="eager"
                          style={{ transition: 'opacity 0.4s' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--panel)' }}>
                          <span className="text-4xl">🎬</span>
                        </div>
                      )}
                      <div
                        className="absolute inset-0 flex flex-col justify-end p-4"
                        style={{ borderRadius: 16, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }}
                      >
                        <h3 className="text-base font-bold" style={{ color: '#fff' }}>{bannerItem.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {bannerItem.releaseDate && (
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {bannerItem.releaseDate.slice(0, 4)}
                            </span>
                          )}
                          {bannerItem.rating && (
                            <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                              <Star size={10} fill="#f59e0b" /> {bannerItem.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {/* Pagination dots */}
                    {bannerItems.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                        {bannerItems.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setBannerIdx(i)}
                            style={{
                              width: i === bannerIdx ? 20 : 6,
                              height: 6, borderRadius: 3, border: 'none',
                              background: i === bannerIdx ? 'var(--brand-yellow)' : 'oklch(0.35 0.012 235)',
                              cursor: 'pointer', transition: 'width 0.2s, background 0.2s',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Unified grid ── */}
              <div className="px-4 pt-4">
                <div className="browse-grid">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className="flex flex-col text-left active:scale-95 transition-transform"
                      onClick={() => handleItemClick(item)}
                    >
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: '2/3', background: 'var(--panel)', borderRadius: 10, marginBottom: 6, border: '1px solid var(--divider)' }}
                      >
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            style={{ borderRadius: 10 }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                        )}
                        {item.rating && (
                          <div
                            className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.75)', color: '#f59e0b' }}
                          >
                            ★ {item.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: 'var(--lv-text)' }}>
                        {item.title}
                      </p>
                      {item.releaseDate && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--lv-muted)' }}>
                          {item.releaseDate.slice(0, 4)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Load more */}
                {page < totalPages && (
                  <button
                    className="w-full mt-5 py-3 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-muted)' }}
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Carregando…' : 'Carregar mais'}
                  </button>
                )}
              </div>

            {/* Loading / empty states inside the grid area */}
            {loading && items.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 px-8 text-center">
                <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>
                  {query ? 'Nenhum resultado encontrado.' : 'Configure VITE_TMDB_API_KEY para navegar no catálogo.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
