/**
 * HomePage — "Descobrir" tab.
 * TMDB catalog with category + sort + search filters.
 * Responsive: 3-col mobile → 4-col tablet → 5-col desktop.
 */
import { useState, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { fetchCatalogPage, fetchCatalogSearch } from '../utils/fetchApiData'
import type { CatalogItem } from '../utils/fetchApiData'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string }[] = [
  { id: 'movies', label: 'Filmes',  color: '#e5a00d' },
  { id: 'series', label: 'Séries',  color: '#00b4ff' },
  { id: 'animes', label: 'Animes',  color: '#a855f7' },
]

const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'popular',   label: 'Populares'       },
  { id: 'trending',  label: 'Em Alta'          },
  { id: 'top_rated', label: 'Mais Avaliados'   },
  { id: 'new',       label: 'Novidades'        },
]

type SortId = 'popular' | 'trending' | 'top_rated' | 'new'

interface Props {
  onOpenDetail: (item: DownloadItem, source: Source) => void
}

const BROWSE_SOURCE: Source = {
  id: 'tmdb-discover', name: 'Descobrir', category: 'movies',
  url: null, downloads: [], addedAt: '',
}

export function HomePage({ onOpenDetail }: Props) {
  const { activeCategory, setActiveCategory } = useAppStore()

  const [items, setItems]             = useState<CatalogItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [sortId, setSortId]           = useState<SortId>('popular')
  const [query, setQuery]             = useState('')
  const [showSearch, setShowSearch]   = useState(false)
  const [showSort, setShowSort]       = useState(false)

  const load = useCallback(async (
    cat: ContentCategory, sort: SortId, pg: number, q: string, append = false,
  ) => {
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      let result: { items: CatalogItem[]; totalPages: number }
      if (q.trim()) {
        result = await fetchCatalogSearch(cat, q.trim(), pg)
      } else {
        const listType = sort === 'new' ? 'new_releases' : sort
        result = await fetchCatalogPage(cat, pg, listType)
      }
      setItems((prev) => append ? [...prev, ...result.items] : result.items)
      setTotalPages(result.totalPages)
    } catch {
      if (!append) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Reset + reload when category or sort changes
  useEffect(() => {
    setPage(1)
    setItems([])
    load(activeCategory, sortId, 1, query)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortId])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load(activeCategory, sortId, 1, query)
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return
    const next = page + 1
    setPage(next)
    load(activeCategory, sortId, next, query, true)
  }

  const openItem = (c: CatalogItem) => {
    const item: DownloadItem = {
      title:      c.title,
      uris:       [],
      uploadDate: c.releaseDate ?? '',
      fileSize:   '',
      coverUrl:   c.cover ?? undefined,
      tmdbId:     c.id,
      category:   activeCategory,
    }
    onOpenDetail(item, { ...BROWSE_SOURCE, category: activeCategory })
  }

  // ── Responsive grid: 3 on mobile, 4 on md, 5 on lg ───────────────────────
  // (Tailwind grid classes not available; use CSS grid with auto-fill)
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(3, 1fr)', // overridden by @media below
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <style>{`
        .discover-grid { grid-template-columns: repeat(3, 1fr); }
        @media (min-width: 600px)  { .discover-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 900px)  { .discover-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1200px) { .discover-grid { grid-template-columns: repeat(6, 1fr); } }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 pt-3 pb-2"
        style={{ background: 'var(--app-bg)', borderBottom: '1px solid var(--divider)' }}
      >
        {/* Category pills + sort + search */}
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            {CATEGORIES.map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => { setActiveCategory(id); setQuery('') }}
                className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  background: activeCategory === id ? color : 'var(--chip)',
                  color:      activeCategory === id ? '#0d111a' : 'var(--lv-muted)',
                  border:     activeCategory === id ? 'none'    : '1px solid var(--divider)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowSort((v) => !v)}
              style={{
                height: 36, padding: '0 12px',
                borderRadius: 10, border: '1px solid var(--divider)',
                background: showSort ? 'var(--panel-2)' : 'var(--chip)',
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', color: 'var(--lv-muted)', fontSize: 12, fontWeight: 500,
              }}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden md:inline">
                {SORT_OPTIONS.find(s => s.id === sortId)?.label}
              </span>
              <ChevronDown size={13} />
            </button>
            {showSort && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setShowSort(false)} />
                <div style={{
                  position: 'absolute', top: 42, right: 0, zIndex: 40,
                  background: 'var(--panel-2)', border: '1px solid var(--divider)',
                  borderRadius: 12, overflow: 'hidden', minWidth: 180,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {SORT_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSortId(s.id as SortId); setShowSort(false) }}
                      style={{
                        width: '100%', padding: '11px 16px', textAlign: 'left',
                        background: sortId === s.id ? 'oklch(0.85 0.17 90 / 0.1)' : 'transparent',
                        color: sortId === s.id ? 'var(--brand-yellow)' : 'var(--lv-text)',
                        border: 'none', cursor: 'pointer', fontSize: 13,
                        fontWeight: sortId === s.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      {s.label}
                      {sortId === s.id && <span style={{ fontSize: 12 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Search toggle */}
          <button
            onClick={() => { setShowSearch((v) => !v); if (showSearch) setQuery('') }}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: (showSearch || query) ? 'var(--brand-yellow)' : 'var(--chip)',
              border: '1px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {showSearch
              ? <X size={15} style={{ color: '#0d111a' }} />
              : <Search size={15} style={{ color: 'var(--lv-muted)' }} />
            }
          </button>
        </div>

        {/* Expandable search bar */}
        {showSearch && (
          <div
            className="flex items-center gap-2 mt-2 rounded-xl px-3 py-2"
            style={{ background: 'var(--chip)', border: '1px solid var(--divider)' }}
          >
            <Search size={14} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              type="search"
              placeholder={`Buscar em ${CATEGORIES.find(c => c.id === activeCategory)?.label ?? ''}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--lv-text)', fontSize: 15 }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X size={14} style={{ color: 'var(--lv-muted)' }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Grid content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-4">

          {loading ? (
            /* Skeleton */
            <div className="discover-grid" style={{ ...gridStyle }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ width: '100%', aspectRatio: '2/3', borderRadius: 10 }} />
                  <div className="skeleton" style={{ height: 11, width: '75%', marginTop: 6, borderRadius: 4 }} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Search size={36} style={{ color: 'var(--lv-muted)', opacity: 0.3 }} />
              <p style={{ fontSize: 14, color: 'var(--lv-muted)' }}>
                {query ? `Nenhum resultado para "${query}"` : 'Sem resultados'}
              </p>
            </div>
          ) : (
            <>
              {/* Item count label */}
              {!loading && (
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                  {query ? `${items.length} resultado${items.length !== 1 ? 's' : ''}` : SORT_OPTIONS.find(s => s.id === sortId)?.label}
                </p>
              )}

              <div className="discover-grid" style={{ ...gridStyle }}>
                {items.map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    className="flex flex-col text-left active:scale-95 transition-transform"
                    onClick={() => openItem(c)}
                  >
                    {/* Poster */}
                    <div style={{
                      width: '100%', aspectRatio: '2/3',
                      background: 'var(--panel)', borderRadius: 10, marginBottom: 6,
                      overflow: 'hidden', position: 'relative', flexShrink: 0,
                    }}>
                      {c.cover ? (
                        <img
                          src={c.cover}
                          alt={c.title}
                          className="w-full h-full object-cover"
                          style={{ borderRadius: 10 }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ fontSize: 28, color: 'var(--lv-muted)' }}>🎬</div>
                      )}
                      {/* Rating badge */}
                      {c.rating && (
                        <div style={{
                          position: 'absolute', bottom: 6, left: 6,
                          background: 'rgba(0,0,0,0.75)', borderRadius: 6,
                          padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3,
                          backdropFilter: 'blur(4px)',
                        }}>
                          <span style={{ fontSize: 9, color: '#f59e0b' }}>★</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>
                            {c.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title + year */}
                    <p style={{
                      fontSize: 11, fontWeight: 500, color: 'var(--lv-text)', lineHeight: 1.3, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {c.title}
                    </p>
                    {c.releaseDate && (
                      <p style={{ fontSize: 10, color: 'var(--lv-muted)', margin: '2px 0 0', opacity: 0.7 }}>
                        {c.releaseDate.slice(0, 4)}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Load more */}
              {page < totalPages && !query && (
                <div className="flex justify-center mt-6 pb-2">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{
                      padding: '11px 32px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: loadingMore ? 'var(--chip)' : 'var(--panel-2)',
                      color: loadingMore ? 'var(--lv-muted)' : 'var(--lv-text)',
                      border: '1px solid var(--divider)',
                      cursor: loadingMore ? 'default' : 'pointer',
                    }}
                  >
                    {loadingMore ? 'Carregando…' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
