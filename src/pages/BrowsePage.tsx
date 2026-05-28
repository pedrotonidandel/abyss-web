import { useState, useEffect, useCallback } from 'react'
import { Search, Film, Tv, Sparkles, BookOpen } from 'lucide-react'
import { fetchCatalogPage, fetchCatalogSearch } from '../utils/fetchApiData'
import type { CatalogItem, CatalogListType } from '../utils/fetchApiData'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'movies',  label: 'Filmes',  color: '#e5a00d', icon: Film },
  { id: 'series',  label: 'Séries',  color: '#00b4ff', icon: Tv },
  { id: 'animes',  label: 'Animes',  color: '#a855f7', icon: Sparkles },
  { id: 'books',   label: 'Livros',  color: '#22c55e', icon: BookOpen },
]

const LIST_TYPES: { id: CatalogListType; label: string }[] = [
  { id: 'popular',      label: 'Popular' },
  { id: 'top_rated',    label: 'Mais Avaliados' },
  { id: 'trending',     label: 'Em Alta' },
  { id: 'new_releases', label: 'Novos' },
]

interface BrowsePageProps {
  onOpenDetail: (item: DownloadItem, source: Source) => void
}

function CatalogCard({ item, categoryColor, onClick }: { item: CatalogItem; categoryColor: string; onClick: () => void }) {
  return (
    <button
      className="flex flex-col rounded-xl overflow-hidden text-left active:scale-95 transition-transform"
      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden" style={{ background: '#1a1a1a' }}>
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
        )}
        {item.rating && (
          <div className="absolute top-1 right-1 rounded-md px-1 py-0.5 text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#f59e0b' }}>
            ★ {item.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: '#e0e0e0' }}>{item.title}</p>
        {item.releaseDate && (
          <span className="text-[10px] mt-0.5 inline-block" style={{ color: categoryColor }}>
            {item.releaseDate.slice(0, 4)}
          </span>
        )}
      </div>
    </button>
  )
}

export function BrowsePage({ onOpenDetail }: BrowsePageProps) {
  const [category, setCategory] = useState<ContentCategory>('movies')
  const [listType, setListType] = useState<CatalogListType>('popular')
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const catInfo = CATEGORIES.find((c) => c.id === category)

  const load = useCallback(async (cat: ContentCategory, lt: CatalogListType, q: string, p: number) => {
    setLoading(true)
    try {
      const result = q
        ? await fetchCatalogSearch(cat, q, p)
        : await fetchCatalogPage(cat, p, lt)
      if (p === 1) {
        setItems(result.items)
      } else {
        setItems((prev) => [...prev, ...result.items])
      }
      setTotalPages(result.totalPages)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
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
    // Construct a stub DownloadItem from the catalog item
    const stub: DownloadItem = {
      title: item.title,
      uris: [],
      uploadDate: item.releaseDate ?? '',
      fileSize: '',
      category: item.category,
      coverUrl: item.cover ?? undefined,
      tmdbId: item.id,
    }
    const stubSource: Source = {
      id: `browse-${item.category}`,
      name: 'Catálogo',
      category: item.category,
      url: null,
      addedAt: new Date().toISOString(),
      downloads: [],
    }
    onOpenDetail(stub, stubSource)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col gap-3" style={{ background: '#0d0d0d' }}>
        <h2 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>Catálogo</h2>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <Search size={16} style={{ color: '#555' }} />
          <input
            type="search"
            placeholder="Buscar no TMDB…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#e0e0e0' }}
          />
        </form>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => { setCategory(id); setQuery(''); setSearchInput('') }}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: category === id ? color : '#111111',
                color: category === id ? '#000' : '#888',
                border: `1px solid ${category === id ? color : '#2a2a2a'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List type filter (only when not searching) */}
        {!query && category !== 'books' && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {LIST_TYPES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setListType(id)}
                className="shrink-0 px-3 py-1 rounded-full text-xs"
                style={{
                  background: listType === id ? '#1e1e1e' : 'transparent',
                  color: listType === id ? '#e0e0e0' : '#555',
                  border: `1px solid ${listType === id ? '#2a2a2a' : 'transparent'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            {catInfo && <catInfo.icon size={32} />}
            <p className="text-sm" style={{ color: '#555' }}>
              {query ? 'Nenhum resultado encontrado.' : 'Configure VITE_TMDB_API_KEY para navegar no catálogo.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 pt-3">
              {items.map((item) => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  categoryColor={catInfo?.color ?? '#888'}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
            {page < totalPages && (
              <button
                className="w-full mt-4 py-3 rounded-xl text-sm"
                style={{ background: '#111111', border: '1px solid #1e1e1e', color: '#888' }}
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  load(category, listType, query, next)
                }}
                disabled={loading}
              >
                {loading ? 'Carregando…' : 'Carregar mais'}
              </button>
            )}
            {loading && items.length === 0 && (
              <div className="flex items-center justify-center h-20">
                <p className="text-sm" style={{ color: '#555' }}>Carregando…</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
