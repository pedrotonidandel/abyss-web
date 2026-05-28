import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, SlidersHorizontal, X, Film, Tv, Sparkles, BookOpen, ChevronRight, Star } from 'lucide-react'
import { fetchCatalogPage, fetchCatalogSearch } from '../utils/fetchApiData'
import type { CatalogItem, CatalogListType } from '../utils/fetchApiData'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'movies', label: 'Filmes',  icon: Film     },
  { id: 'series', label: 'Séries',  icon: Tv       },
  { id: 'animes', label: 'Animes',  icon: Sparkles },
  { id: 'books',  label: 'Livros',  icon: BookOpen },
]

const LIST_TYPES: { id: CatalogListType; label: string }[] = [
  { id: 'popular',      label: 'Popular'          },
  { id: 'trending',     label: 'Em Alta'          },
  { id: 'top_rated',    label: 'Mais Avaliados'   },
  { id: 'new_releases', label: 'Novos'            },
]

interface Props {
  onOpenDetail: (item: DownloadItem, source: Source) => void
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

export function BrowsePage({ onOpenDetail }: Props) {
  const [category, setCategory]       = useState<ContentCategory>('movies')
  const [listType, setListType]       = useState<CatalogListType>('popular')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery]             = useState('')
  const [items, setItems]             = useState<CatalogItem[]>([])
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [loading, setLoading]         = useState(false)
  const [filterOpen, setFilterOpen]   = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('Todos')

  // Derive unique genres from loaded items
  const genres = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => item.genres.forEach((g) => set.add(g)))
    return ['Todos', ...Array.from(set).slice(0, 12)]
  }, [items])

  const visibleItems = useMemo(() => {
    if (selectedGenre === 'Todos') return items
    return items.filter((item) => item.genres.includes(selectedGenre))
  }, [items, selectedGenre])

  const featured   = visibleItems[0] ?? null
  const newItems   = visibleItems.slice(1, 7)
  const gridItems  = visibleItems.slice(7)

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
    setSelectedGenre('Todos')
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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* ── Top bar ── */}
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ background: '#0d0d0d' }}>

        {/* Search + filter */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: '#161616', border: '1px solid #1e1e1e' }}
          >
            <Search size={15} style={{ color: '#444' }} />
            <input
              type="search"
              placeholder="Filmes, séries, animes…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#e0e0e0' }}
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setQuery('') }}>
                <X size={14} style={{ color: '#555' }} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 42, height: 42,
              background: filterOpen ? '#1e1e1e' : '#161616',
              border: '1px solid #1e1e1e',
              color: filterOpen ? '#fff' : '#555',
            }}
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal size={17} />
          </button>
        </form>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-0.5">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setCategory(id); setQuery(''); setSearchInput('') }}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: category === id ? '#ffffff' : '#181818',
                color:      category === id ? '#000000' : '#666',
                border:     category === id ? 'none'    : '1px solid #222',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Genre filter pills (when items loaded) */}
        {!query && genres.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2.5 pb-0.5">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: selectedGenre === g ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color:      selectedGenre === g ? '#fff' : '#555',
                  border:     `1px solid ${selectedGenre === g ? 'rgba(255,255,255,0.2)' : '#222'}`,
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm" style={{ color: '#555' }}>Carregando…</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-8 text-center">
            <p className="text-sm" style={{ color: '#555' }}>
              {query ? 'Nenhum resultado encontrado.' : 'Configure VITE_TMDB_API_KEY para navegar no catálogo.'}
            </p>
          </div>
        ) : (
          <div className="pb-8">

            {/* Featured wide banner */}
            {featured && (
              <div className="px-4 pt-2">
                <button
                  className="relative w-full overflow-hidden active:scale-[0.99] transition-transform"
                  style={{ borderRadius: 16, aspectRatio: '16/9' }}
                  onClick={() => handleItemClick(featured)}
                >
                  {(featured.backdrop ?? featured.cover) ? (
                    <img
                      src={featured.backdrop ?? featured.cover!}
                      alt={featured.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                      <span className="text-4xl">🎬</span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-4"
                    style={{ borderRadius: 16, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)' }}
                  >
                    <h3 className="text-base font-bold" style={{ color: '#fff' }}>{featured.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {featured.releaseDate && (
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {featured.releaseDate.slice(0, 4)}
                        </span>
                      )}
                      {featured.rating && (
                        <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                          <Star size={10} fill="#f59e0b" /> {featured.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* "Novos" section — horizontal row */}
            {newItems.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between px-4 mb-3">
                  <h3 className="text-[15px] font-bold" style={{ color: '#e0e0e0' }}>
                    {LIST_TYPES.find((l) => l.id === listType)?.label ?? 'Novos'}
                  </h3>
                  <button className="flex items-center gap-0.5 text-xs" style={{ color: '#555' }}>
                    Ver todos <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-1">
                  {newItems.map((item) => (
                    <button
                      key={item.id}
                      className="shrink-0 text-left active:scale-95 transition-transform"
                      style={{ width: 104 }}
                      onClick={() => handleItemClick(item)}
                    >
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: '2/3', background: '#1a1a1a', borderRadius: 12 }}
                      >
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            style={{ borderRadius: 12 }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                        )}
                        {item.rating && (
                          <div
                            className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: 'rgba(0,0,0,0.75)', color: '#f59e0b' }}
                          >
                            <Star size={8} fill="#f59e0b" /> {item.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium mt-1.5 leading-tight line-clamp-1" style={{ color: '#e0e0e0' }}>
                        {item.title}
                      </p>
                      {item.releaseDate && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
                          {item.releaseDate.slice(0, 4)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All items — 3-col grid (4-col on md+) */}
            {gridItems.length > 0 && (
              <div className="mt-6 px-4">
                <h3 className="text-[15px] font-bold mb-3" style={{ color: '#e0e0e0' }}>Todos</h3>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                >
                  {gridItems.map((item) => (
                    <button
                      key={item.id}
                      className="flex flex-col text-left active:scale-95 transition-transform"
                      onClick={() => handleItemClick(item)}
                    >
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: '2/3', background: '#1a1a1a', borderRadius: 10, marginBottom: 6 }}
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
                      <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: '#e0e0e0' }}>
                        {item.title}
                      </p>
                      {item.releaseDate && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
                          {item.releaseDate.slice(0, 4)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {page < totalPages && (
                  <button
                    className="w-full mt-5 py-3 rounded-xl text-sm font-medium"
                    style={{ background: '#161616', border: '1px solid #1e1e1e', color: '#888' }}
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Carregando…' : 'Carregar mais'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ Filter bottom sheet ══ */}
      {filterOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            onClick={() => setFilterOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              background: '#141414',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              maxHeight: '80vh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="rounded-full" style={{ width: 36, height: 4, background: '#333' }} />
            </div>

            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <h3 className="text-base font-bold" style={{ color: '#fff' }}>Filtros</h3>
              <button onClick={() => setFilterOpen(false)} style={{ color: '#555' }}>
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-6 flex flex-col gap-5">
              {/* Content type */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#555' }}>Conteúdo</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => { setCategory(id); setQuery(''); setSearchInput('') }}
                      className="px-4 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        background: category === id ? '#ffffff' : '#1e1e1e',
                        color:      category === id ? '#000' : '#888',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort / list type */}
              {category !== 'books' && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#555' }}>Ordenar por</p>
                  <div className="flex flex-wrap gap-2">
                    {LIST_TYPES.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setListType(id)}
                        className="px-4 py-1.5 rounded-full text-sm font-medium"
                        style={{
                          background: listType === id ? '#1e1e1e' : 'transparent',
                          color:      listType === id ? '#e0e0e0' : '#555',
                          border:     `1px solid ${listType === id ? '#2a2a2a' : 'transparent'}`,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply */}
              <button
                className="w-full py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: '#ffffff', color: '#000' }}
                onClick={() => setFilterOpen(false)}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
