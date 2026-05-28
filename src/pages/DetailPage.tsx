import { useState, useEffect } from 'react'
import { ArrowLeft, Heart, Eye, ExternalLink, Smartphone, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { fetchDetail } from '../utils/fetchApiData'
import { contentKey } from '../utils/contentKey'
import { Comments } from '../components/ui/Comments'
import type { DownloadItem, Source } from '../types'
import type { ApiDetail } from '../utils/fetchApiData'

interface DetailPageProps {
  item: DownloadItem
  source: Source
  onClose: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  movies: '#e5a00d',
  series: '#00b4ff',
  books: '#22c55e',
  animes: '#a855f7',
}

export function DetailPage({ item, source, onClose }: DetailPageProps) {
  const { user, library, toggleLikedInStore, toggleWatchedInStore } = useAppStore()
  const [detail, setDetail] = useState<ApiDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [ck, setCk] = useState<string | null>(null)

  const category = item.category ?? source.category
  const catColor = CATEGORY_COLORS[category] ?? '#888'

  const libEntry = library.find((l) =>
    l.title === item.title && l.category === category
  )

  useEffect(() => {
    loadDetail()
    computeKey()
  }, [item.title, category])

  const loadDetail = async () => {
    setLoading(true)
    try {
      const d = await fetchDetail(item.title, category, item.tmdbId)
      setDetail(d)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const computeKey = async () => {
    const key = await contentKey(item.title, category, item.tmdbId)
    setCk(key)
  }

  const handleLike = async () => {
    if (!libEntry) return
    toggleLikedInStore(libEntry.id)
    try { await api.library.toggleLike(libEntry.id) }
    catch { toggleLikedInStore(libEntry.id) }
  }

  const handleWatched = async () => {
    if (!libEntry) return
    toggleWatchedInStore(libEntry.id)
    try { await api.library.toggleWatched(libEntry.id) }
    catch { toggleWatchedInStore(libEntry.id) }
  }

  const openInApp = () => {
    const url = `abyss://detail?title=${encodeURIComponent(item.title)}&category=${encodeURIComponent(category)}`
    window.location.href = url
  }

  const cover = detail?.cover ?? item.coverUrl ?? null
  const backdrop = detail?.backdrop ?? null
  const title = detail?.title ?? item.title

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0d0d' }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Backdrop / cover hero */}
        <div className="relative w-full" style={{ minHeight: 240 }}>
          {(backdrop ?? cover) ? (
            <img
              src={backdrop ?? cover!}
              alt={title}
              className="w-full object-cover"
              style={{ maxHeight: 280, minHeight: 240 }}
              loading="eager"
            />
          ) : (
            <div className="w-full" style={{ height: 240, background: '#1a1a1a' }} />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.4) 0%, rgba(13,13,13,0.9) 80%, #0d0d0d 100%)' }} />
          {/* Back button */}
          <button
            className="absolute top-4 left-4 p-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={onClose}
          >
            <ArrowLeft size={20} style={{ color: '#e0e0e0' }} />
          </button>
        </div>

        {/* Info section */}
        <div className="px-4 -mt-10 pb-8 flex flex-col gap-4">
          {/* Cover + title row */}
          <div className="flex gap-3">
            {cover && (
              <div className="shrink-0 w-24 rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #1e1e1e' }}>
                <img src={cover} alt={title} className="w-full h-36 object-cover" />
              </div>
            )}
            <div className="flex-1 flex flex-col justify-end gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full self-start"
                style={{ background: catColor + '20', color: catColor }}>
                {category}
              </span>
              <h1 className="text-lg font-bold leading-tight" style={{ color: '#e0e0e0' }}>{title}</h1>
              {detail?.releaseDate && (
                <p className="text-xs" style={{ color: '#555' }}>{detail.releaseDate.slice(0, 4)}</p>
              )}
              {detail?.rating && (
                <div className="flex items-center gap-1">
                  <Star size={12} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                  <span className="text-xs" style={{ color: '#f59e0b' }}>{detail.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-medium"
              style={{ background: '#00b4ff', color: '#000' }}
              onClick={openInApp}
            >
              <Smartphone size={16} /> Abrir no app
            </button>
            {libEntry && (
              <>
                <button
                  className="p-2.5 rounded-xl"
                  style={{ background: libEntry.liked ? '#ff446620' : '#111111', border: '1px solid #1e1e1e' }}
                  onClick={handleLike}
                >
                  <Heart size={20} fill={libEntry.liked ? '#ff4466' : 'none'}
                    style={{ color: libEntry.liked ? '#ff4466' : '#555' }} />
                </button>
                <button
                  className="p-2.5 rounded-xl"
                  style={{ background: libEntry.watched ? '#22c55e20' : '#111111', border: '1px solid #1e1e1e' }}
                  onClick={handleWatched}
                >
                  <Eye size={20} style={{ color: libEntry.watched ? '#22c55e' : '#555' }} />
                </button>
              </>
            )}
          </div>

          {/* Description */}
          {detail?.description && (
            <div className="p-3 rounded-xl" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#ccc' }}>{detail.description}</p>
            </div>
          )}

          {/* Genres */}
          {detail?.genres && detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detail.genres.map((g) => (
                <span key={g} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888' }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Developer / director */}
          {detail?.developer && (
            <p className="text-xs" style={{ color: '#555' }}>
              Direção / Criação: <span style={{ color: '#888' }}>{detail.developer}</span>
            </p>
          )}

          {/* Streaming services */}
          {detail?.streamingServices && detail.streamingServices.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold" style={{ color: '#888' }}>Onde assistir</h4>
              <div className="flex flex-wrap gap-2">
                {detail.streamingServices.map((s) => (
                  <a key={s.name} href={s.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                    {s.logo && <img src={s.logo} alt={s.name} className="w-5 h-5 rounded" />}
                    <span className="text-xs" style={{ color: '#ccc' }}>{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {detail?.trailerUrl && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold" style={{ color: '#888' }}>Trailer</h4>
              <a href={detail.trailerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <ExternalLink size={16} style={{ color: '#00b4ff' }} />
                <span className="text-sm" style={{ color: '#00b4ff' }}>Abrir trailer no YouTube</span>
              </a>
            </div>
          )}

          {/* Buy links */}
          {detail?.buyLinks && detail.buyLinks.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold" style={{ color: '#888' }}>Links</h4>
              <div className="flex flex-wrap gap-2">
                {detail.buyLinks.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc' }}>
                    <ExternalLink size={12} /> {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Cast */}
          {detail?.cast && detail.cast.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold" style={{ color: '#888' }}>Elenco</h4>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {detail.cast.map((c) => (
                  <div key={c.name} className="flex flex-col items-center gap-1 shrink-0 w-16">
                    <div className="w-12 h-12 rounded-full overflow-hidden"
                      style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                      )}
                    </div>
                    <p className="text-[10px] text-center leading-tight line-clamp-2" style={{ color: '#888' }}>{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasons (series) */}
          {item.seasons && item.seasons.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold" style={{ color: '#888' }}>Temporadas</h4>
              {item.seasons.map((season) => (
                <div key={season.season} className="p-3 rounded-xl" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: '#e0e0e0' }}>Temporada {season.season}</p>
                  <div className="flex flex-col gap-1">
                    {season.episodes.map((ep, i) => (
                      <p key={i} className="text-xs" style={{ color: '#888' }}>
                        E{i + 1} — {ep.title}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && !detail && (
            <p className="text-xs text-center" style={{ color: '#555' }}>Buscando detalhes…</p>
          )}

          {/* Comments */}
          {ck && user && (
            <div className="mt-2">
              <Comments contentKey={ck} currentUserId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
