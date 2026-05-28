import { useMemo } from 'react'
import { Heart, Eye, Film, Tv, BookOpen, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import type { ContentCategory, DownloadItem, Source, LibraryItemServer } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string }[] = [
  { id: 'movies',  label: 'Filmes',  color: '#e5a00d' },
  { id: 'series',  label: 'Séries',  color: '#00b4ff' },
  { id: 'books',   label: 'Livros',  color: '#22c55e' },
  { id: 'animes',  label: 'Animes',  color: '#a855f7' },
]

const STATUS_LABELS: Record<LibraryItemServer['status'], string> = {
  queued: 'Na fila',
  downloading: 'Baixando',
  completed: 'Concluído',
  paused: 'Pausado',
  error: 'Erro',
}

const STATUS_COLORS: Record<LibraryItemServer['status'], string> = {
  queued: '#888',
  downloading: '#00b4ff',
  completed: '#22c55e',
  paused: '#f59e0b',
  error: '#ff4444',
}

const CAT_ICONS: Record<ContentCategory, React.ComponentType<{ size?: number }>> = {
  movies: Film,
  series: Tv,
  books: BookOpen,
  animes: Sparkles,
}

interface LibraryPageProps {
  onOpenDetail: (item: DownloadItem, source: Source) => void
}

function LibraryCard({ entry, catColor, onLike, onWatched, onClick }: {
  entry: LibraryItemServer
  catColor: string
  onLike: () => void
  onWatched: () => void
  onClick: () => void
}) {
  const CatIcon = CAT_ICONS[entry.category]
  return (
    <div
      className="flex gap-3 p-3 rounded-xl cursor-pointer active:opacity-80"
      style={{ background: '#111111', border: '1px solid #1e1e1e' }}
      onClick={onClick}
    >
      {/* Cover */}
      <div className="shrink-0 w-14 h-20 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: '#1a1a1a' }}>
        {entry.coverUrl ? (
          <img src={entry.coverUrl} alt={entry.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <CatIcon size={24} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium leading-tight line-clamp-2" style={{ color: '#e0e0e0' }}>{entry.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: STATUS_COLORS[entry.status] + '20', color: STATUS_COLORS[entry.status] }}>
              {STATUS_LABELS[entry.status]}
            </span>
            <span className="text-[10px]" style={{ color: catColor }}>{entry.category}</span>
          </div>
          {entry.status === 'downloading' && (
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
              <div className="h-full rounded-full" style={{ width: `${entry.progress}%`, background: '#00b4ff' }} />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            className="flex items-center gap-1 text-xs"
            style={{ color: entry.liked ? '#ff4466' : '#555' }}
            onClick={(e) => { e.stopPropagation(); onLike() }}
          >
            <Heart size={14} fill={entry.liked ? '#ff4466' : 'none'} />
            Curtido
          </button>
          <button
            className="flex items-center gap-1 text-xs"
            style={{ color: entry.watched ? '#22c55e' : '#555' }}
            onClick={(e) => { e.stopPropagation(); onWatched() }}
          >
            <Eye size={14} />
            {entry.watched ? 'Visto' : 'Marcar como visto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function LibraryPage({ onOpenDetail }: LibraryPageProps) {
  const { library, activeCategory, setActiveCategory, toggleLikedInStore, toggleWatchedInStore, sources } = useAppStore()

  const filtered = useMemo(
    () => library.filter((l) => l.category === activeCategory),
    [library, activeCategory],
  )

  const handleLike = async (id: string) => {
    toggleLikedInStore(id)
    try { await api.library.toggleLike(id) } catch { toggleLikedInStore(id) }
  }

  const handleWatched = async (id: string) => {
    toggleWatchedInStore(id)
    try { await api.library.toggleWatched(id) } catch { toggleWatchedInStore(id) }
  }

  const handleOpen = (entry: LibraryItemServer) => {
    // Find the corresponding download item from sources
    for (const src of sources) {
      if (src.category !== entry.category) continue
      const item = src.downloads.find((d) => d.title === entry.title)
      if (item) { onOpenDetail(item, src); return }
    }
    // Fallback: create a stub
    const stub: DownloadItem = {
      title: entry.title,
      uris: [],
      uploadDate: '',
      fileSize: '',
      category: entry.category,
      coverUrl: entry.coverUrl ?? undefined,
    }
    const stubSource: Source = {
      id: 'library',
      name: 'Biblioteca',
      category: entry.category,
      url: null,
      addedAt: entry.addedAt,
      downloads: [],
    }
    onOpenDetail(stub, stubSource)
  }

  const catInfo = CATEGORIES.find((c) => c.id === activeCategory)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col gap-3" style={{ background: '#0d0d0d' }}>
        <h2 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>Biblioteca</h2>
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
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm" style={{ color: '#555' }}>Nenhum item em {catInfo?.label ?? activeCategory}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-3">
            {filtered.map((entry) => (
              <LibraryCard
                key={entry.id}
                entry={entry}
                catColor={catInfo?.color ?? '#888'}
                onLike={() => handleLike(entry.id)}
                onWatched={() => handleWatched(entry.id)}
                onClick={() => handleOpen(entry)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
