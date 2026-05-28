import { useState, useMemo } from 'react'
import { Search, Film, Tv, BookOpen, Sparkles, Plus, RefreshCw } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'movies',  label: 'Filmes',  color: '#e5a00d', icon: Film },
  { id: 'series',  label: 'Séries',  color: '#00b4ff', icon: Tv },
  { id: 'books',   label: 'Livros',  color: '#22c55e', icon: BookOpen },
  { id: 'animes',  label: 'Animes',  color: '#a855f7', icon: Sparkles },
]

interface HomePageProps {
  onOpenDetail: (item: DownloadItem, source: Source) => void
}

interface ContentCardProps {
  item: DownloadItem
  source: Source
  categoryColor: string
  onClick: () => void
}

function ContentCard({ item, categoryColor, onClick }: ContentCardProps) {
  return (
    <button
      className="flex flex-col rounded-xl overflow-hidden text-left active:scale-95 transition-transform"
      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden" style={{ background: '#1a1a1a' }}>
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium leading-tight line-clamp-2" style={{ color: '#e0e0e0' }}>{item.title}</p>
        {item.category && (
          <span className="text-[10px] mt-1 inline-block" style={{ color: categoryColor }}>{item.category}</span>
        )}
      </div>
    </button>
  )
}

export function HomePage({ onOpenDetail }: HomePageProps) {
  const { sources, activeCategory, setActiveCategory, searchQuery, setSearchQuery } = useAppStore()
  const [refreshKey, setRefreshKey] = useState(0)

  const catInfo = CATEGORIES.find((c) => c.id === activeCategory)

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const results: { item: DownloadItem; source: Source }[] = []
    for (const source of sources) {
      if (source.category !== activeCategory) continue
      for (const item of source.downloads) {
        if (!q || item.title.toLowerCase().includes(q)) {
          results.push({ item, source })
        }
      }
    }
    return results
  }, [sources, activeCategory, searchQuery, refreshKey])

  const hasAnySources = sources.length > 0
  const hasCategorySources = sources.some((s) => s.category === activeCategory)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col gap-3" style={{ background: '#0d0d0d' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>Início</h2>
          <button onClick={() => setRefreshKey((k) => k + 1)} style={{ color: '#555' }}>
            <RefreshCw size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <Search size={16} style={{ color: '#555' }} />
          <input
            type="search"
            placeholder="Buscar no catálogo…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#e0e0e0' }}
          />
        </div>
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: activeCategory === id ? color : '#111111',
                color: activeCategory === id ? '#000' : '#888',
                border: `1px solid ${activeCategory === id ? color : '#2a2a2a'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!hasAnySources ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <span className="text-4xl">📦</span>
            <p className="text-sm text-center" style={{ color: '#555' }}>Nenhuma fonte adicionada ainda.</p>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#00b4ff', color: '#000' }}
              onClick={() => {/* navigate to browse or sources management */}}
            >
              <Plus size={16} /> Adicionar fonte
            </button>
          </div>
        ) : !hasCategorySources ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <span className="text-4xl" style={{ color: catInfo?.color }}>
              {catInfo && <catInfo.icon size={40} />}
            </span>
            <p className="text-sm" style={{ color: '#555' }}>Sem fontes para {catInfo?.label ?? activeCategory}.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#555' }}>Nenhum resultado encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 pt-3">
            {filteredItems.map(({ item, source }, idx) => (
              <ContentCard
                key={`${source.id}-${idx}`}
                item={item}
                source={source}
                categoryColor={catInfo?.color ?? '#888'}
                onClick={() => onOpenDetail(item, source)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
