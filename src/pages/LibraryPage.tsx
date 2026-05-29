import { useMemo } from 'react'
import { Heart, Eye, Film, Tv, BookOpen, Sparkles, Gamepad2, Bell, X } from 'lucide-react'
// BookOpen/Gamepad2 kept for CAT_ICONS map (legacy items may still exist in persisted library data)
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import type { ContentCategory, DownloadItem, Source, LibraryItemServer } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string }[] = [
  { id: 'movies',  label: 'Filmes',  color: '#e5a00d' },
  { id: 'series',  label: 'Séries',  color: '#00b4ff' },
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
  queued: 'var(--lv-muted)',
  downloading: 'var(--brand-yellow)',
  completed: '#22c55e',
  paused: '#f59e0b',
  error: '#ff4444',
}

const CAT_ICONS: Record<ContentCategory, React.ComponentType<{ size?: number }>> = {
  movies: Film,
  series: Tv,
  books: BookOpen,
  animes: Sparkles,
  games: Gamepad2,
}

const CAT_EMOJIS: Record<ContentCategory, string> = {
  movies: '🎬',
  series: '📺',
  books: '📚',
  animes: '🌸',
  games: '🎮',
}

interface LibraryPageProps {
  onOpenDetail: (item: DownloadItem, source: Source) => void
  unreadCount?: number
  onNotifOpen?: () => void
}

function LibraryCard({ entry, index, onLike, onWatched, onRemove, onClick }: {
  entry: LibraryItemServer
  index: number
  onLike: () => void
  onWatched: () => void
  onRemove: () => void
  onClick: () => void
}) {
  const CatIcon = CAT_ICONS[entry.category]
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        aspectRatio: '2/3',
        cursor: 'pointer',
        background: 'var(--panel)',
        animation: `fadeInUp 0.25s ease forwards`,
        animationDelay: `${index * 0.05}s`,
        opacity: 0,
      }}
      className="active:scale-95 transition-transform"
    >
      {/* Cover */}
      {entry.coverUrl ? (
        <img
          src={entry.coverUrl}
          alt={entry.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
        }}>
          <CatIcon size={40} />
        </div>
      )}

      {/* Remove button — top-left × */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{
          position: 'absolute', top: 6, left: 6,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={11} style={{ color: '#fff' }} />
      </button>

      {/* Status dot — top-right */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 8, height: 8, borderRadius: '50%',
        background: STATUS_COLORS[entry.status],
        boxShadow: `0 0 4px ${STATUS_COLORS[entry.status]}`,
      }} />

      {/* Bottom gradient + info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
        padding: '28px 8px 8px',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {entry.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: STATUS_COLORS[entry.status],
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {STATUS_LABELS[entry.status]}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onLike() }}
              style={{
                width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Heart
                size={12}
                fill={entry.liked ? '#ff4466' : 'none'}
                style={{ color: entry.liked ? '#ff4466' : '#fff' }}
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onWatched() }}
              style={{
                width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Eye size={12} style={{ color: entry.watched ? '#22c55e' : '#fff' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar — only when downloading */}
      {entry.status === 'downloading' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
          <div style={{ height: '100%', width: `${entry.progress ?? 0}%`, background: 'var(--brand-yellow)' }} />
        </div>
      )}
    </div>
  )
}

export function LibraryPage({
  onOpenDetail,
  unreadCount,
  onNotifOpen,
}: LibraryPageProps) {
  const { library, activeCategory, setActiveCategory, toggleLikedInStore, toggleWatchedInStore, setLibrary, sources } = useAppStore()

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

  const handleRemove = async (id: string, title: string) => {
    if (!confirm(`Remover "${title}" da biblioteca?`)) return
    try {
      await api.library.remove(id)
      setLibrary(library.filter((l) => l.id !== id))
    } catch { /* ignore */ }
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
      <style>{`
        .library-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          padding: 12px;
        }
        @media (min-width: 600px) {
          .library-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .library-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div
        className="shrink-0 flex flex-col gap-2"
        style={{ background: 'var(--app-bg)', borderBottom: '1px solid var(--divider)' }}
      >
        {/* Header row: title + count + bell */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--lv-text)' }}>Biblioteca</h2>
            <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>
              {filtered.length} {filtered.length === 1 ? 'título' : 'títulos'}
            </span>
          </div>
          <button
            onClick={onNotifOpen}
            style={{
              position: 'relative', width: 36, height: 36,
              borderRadius: '50%', background: 'var(--chip)',
              border: '1px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={18} style={{ color: (unreadCount ?? 0) > 0 ? 'var(--brand-yellow)' : 'var(--lv-muted)' }} />
            {(unreadCount ?? 0) > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--brand-yellow)',
              }} />
            )}
          </button>
        </div>

        {/* Category tabs — underline style */}
        <div className="flex overflow-x-auto no-scrollbar px-4 pb-0">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="shrink-0 px-4 py-2 text-xs font-semibold"
              style={{
                color: activeCategory === id ? 'var(--lv-text)' : 'var(--lv-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeCategory === id
                  ? '2px solid var(--brand-yellow)'
                  : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--app-bg)' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span style={{ fontSize: 48 }}>{CAT_EMOJIS[activeCategory] ?? '🎬'}</span>
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>
              Nenhum item em {catInfo?.label ?? activeCategory}.
            </p>
          </div>
        ) : (
          <div className="library-grid">
            {filtered.map((entry, index) => (
              <LibraryCard
                key={entry.id}
                entry={entry}
                index={index}
                onLike={() => handleLike(entry.id)}
                onWatched={() => handleWatched(entry.id)}
                onRemove={() => handleRemove(entry.id, entry.title)}
                onClick={() => handleOpen(entry)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
