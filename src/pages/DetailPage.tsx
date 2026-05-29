import { useState, useEffect } from 'react'
import { ArrowLeft, Heart, Eye, Star, Play, ExternalLink, MoreVertical, Clock } from 'lucide-react'
import { TorrentPlayer } from '../components/ui/TorrentPlayer'
import { WatchOptionsSheet } from '../components/ui/WatchOptionsSheet'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { fetchDetail } from '../utils/fetchApiData'
import { contentKey } from '../utils/contentKey'
import { Comments } from '../components/ui/Comments'
import type { DownloadItem, Source, SeriesSeason } from '../types'
import type { ApiDetail, CastMember, TmdbSeason } from '../utils/fetchApiData'

interface DetailPageProps {
  item: DownloadItem
  source: Source
  onClose: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  movies:  '#e5a00d',
  series:  '#00b4ff',
  books:   '#22c55e',
  animes:  '#a855f7',
  games:   '#f97316',
}

const CATEGORY_LABELS: Record<string, string> = {
  movies:  'Filme',
  series:  'Série',
  books:   'Livro',
  animes:  'Anime',
  games:   'Jogo',
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function SeriesEpisodesSection({
  addonSeasons,
  tmdbSeasons,
  onStream,
}: {
  addonSeasons: SeriesSeason[]
  tmdbSeasons: TmdbSeason[]
  onStream: (uri: string) => void
}) {
  const [selectedSeason, setSelectedSeason] = useState(0)

  // Merge: prefer addon seasons (have magnets), fall back to TMDB for metadata
  const seasons = addonSeasons.length > 0 ? addonSeasons : tmdbSeasons.map(ts => ({
    season: ts.seasonNumber,
    uri: '',
    episodes: ts.episodes.map(ep => ({
      title: `Ep ${ep.number} — ${ep.title}`,
      uri: '',
      uploadDate: ep.airDate ?? '',
    }))
  }))

  // Match TMDB still images to addon episodes by index
  const getTmdbEp = (seasonIdx: number, epIdx: number) => {
    const ts = tmdbSeasons.find(s => s.seasonNumber === (seasons[seasonIdx]?.season ?? seasonIdx + 1))
    return ts?.episodes[epIdx] ?? null
  }

  const currentSeason = seasons[selectedSeason]
  if (!currentSeason) return null

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Season selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14 }} className="no-scrollbar">
        {seasons.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelectedSeason(i)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: selectedSeason === i ? 'var(--brand-yellow)' : 'var(--chip)',
              color: selectedSeason === i ? '#0d111a' : 'var(--lv-muted)',
              border: selectedSeason === i ? 'none' : '1px solid var(--divider)',
              cursor: 'pointer',
            }}
          >
            {s.season === 0 ? 'Especiais' : `Temporada ${s.season}`}
          </button>
        ))}
      </div>

      {/* Episode list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {currentSeason.episodes.map((ep, epIdx) => {
          const tmdbEp = getTmdbEp(selectedSeason, epIdx)
          const hasStream = ep.uri?.startsWith('magnet:')
          const displayTitle = ep.title.replace(/^Ep \d+ — /, '')

          return (
            <div
              key={epIdx}
              style={{
                display: 'flex', gap: 10, alignItems: 'center',
                padding: '10px 12px', borderRadius: 12,
                background: 'var(--panel)', border: '1px solid var(--divider)',
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 96, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'var(--panel-2)', border: '1px solid var(--divider)',
              }}>
                {tmdbEp?.still ? (
                  <img src={tmdbEp.still} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📺</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: '0 0 2px', fontWeight: 500 }}>
                  Ep {epIdx + 1}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayTitle}
                </p>
                {(tmdbEp?.airDate ?? ep.uploadDate) && (
                  <p style={{ fontSize: 10, color: 'oklch(0.45 0.01 240)', margin: '2px 0 0' }}>
                    {new Date(tmdbEp?.airDate ?? ep.uploadDate ?? '').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Play button */}
              {hasStream && (
                <button
                  onClick={() => onStream(ep.uri!)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'oklch(0.85 0.17 90 / 0.12)',
                    border: '1px solid oklch(0.85 0.17 90 / 0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Play size={14} fill="var(--brand-yellow)" style={{ color: 'var(--brand-yellow)', marginLeft: 2 }} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DetailPage({ item, source, onClose }: DetailPageProps) {
  const { user, library, toggleLikedInStore, toggleWatchedInStore } = useAppStore()
  const [detail, setDetail] = useState<ApiDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [ck, setCk] = useState<string | null>(null)
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [streamUri, setStreamUri] = useState<string | null>(null)
  const [watchOpen, setWatchOpen] = useState(false)

  const category = item.category ?? source.category
  const catColor = CATEGORY_COLORS[category] ?? '#888'
  const catLabel = CATEGORY_LABELS[category] ?? category

  const libEntry = library.find(
    (l) => l.title === item.title && l.category === category,
  )

  useEffect(() => {
    setDetail(null)
    setLoading(true)
    setHeroLoaded(false)
    loadDetail()
    computeKey()
  }, [item.title, category])

  const loadDetail = async () => {
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

  const heroImage = detail?.backdrop ?? detail?.cover ?? item.coverUrl ?? null
  const title     = detail?.title ?? item.title
  const rating    = detail?.rating ?? null
  const votes     = detail?.voteCount ?? null
  const runtime   = detail?.runtime ?? null
  const genres    = detail?.genres ?? []
  const releaseYear = (() => {
    const raw = detail?.releaseDate || item.uploadDate || ''
    if (!raw || raw.trim() === '') return null
    const y = String(raw).slice(0, 4)
    return /^\d{4}$/.test(y) && parseInt(y) > 1900 ? y : null
  })()

  // ── Sections ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--app-bg)' }}>
      <div className="flex-1 overflow-y-auto">

        {/* ── Hero image ─────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', width: '100%', height: 300, background: 'var(--panel)', overflow: 'hidden' }}>
          {heroImage && (
            <img
              src={heroImage}
              alt={title}
              onLoad={() => setHeroLoaded(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: heroLoaded ? 1 : 0, transition: 'opacity 0.3s',
              }}
            />
          )}
          {/* Dark gradient overlay — bottom fade into bg */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.10) 40%, rgba(17,23,32,0.85) 80%, var(--app-bg) 100%)',
          }} />

          {/* Back button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, left: 16,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={18} style={{ color: '#fff' }} />
          </button>

          {/* More button */}
          <button
            className="md:hidden"
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={18} style={{ color: '#fff' }} />
          </button>

          {/* Play button — opens where-to-watch sheet */}
          <button
            onClick={() => setWatchOpen(true)}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Play size={22} fill="white" style={{ color: 'white', marginLeft: 3 }} />
          </button>
        </div>

        {/* ── Content below hero ──────────────────────────────────────────── */}
        <div style={{ padding: '0 16px 24px' }}>

          {/* Date + title */}
          {releaseYear && (
            <p style={{ fontSize: 12, color: 'var(--lv-muted)', marginBottom: 4, marginTop: -8 }}>
              {releaseYear}
            </p>
          )}
          <h1 style={{
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
            color: 'var(--lv-text)', margin: '0 0 12px', lineHeight: 1.2,
          }}>
            {title}
          </h1>

          {/* Tags row */}
          {(runtime || genres.length > 0 || catLabel) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {runtime && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 20,
                  background: 'var(--chip)', color: 'var(--lv-muted)',
                  border: '1px solid var(--divider)',
                }}>
                  <Clock size={11} /> {formatRuntime(runtime)}
                </span>
              )}
              {genres.slice(0, 2).map(g => (
                <span key={g} style={{
                  fontSize: 12, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 20,
                  background: 'var(--chip)', color: 'var(--lv-muted)',
                  border: '1px solid var(--divider)',
                }}>
                  {g}
                </span>
              ))}
              <span style={{
                fontSize: 12, fontWeight: 600,
                padding: '4px 10px', borderRadius: 20,
                background: catColor + '18', color: catColor,
                border: `1px solid ${catColor}30`,
              }}>
                {catLabel}
              </span>
            </div>
          )}

          {/* Rating row */}
          {rating != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Star size={16} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>
                  {rating.toFixed(1)}
                </span>
                <span style={{ fontSize: 13, color: 'var(--lv-muted)' }}>/10</span>
                {votes != null && (
                  <span style={{ fontSize: 12, color: 'var(--lv-muted)', marginLeft: 4 }}>
                    {votes >= 1000 ? `${(votes / 1000).toFixed(0)}K votos` : `${votes} votos`}
                  </span>
                )}
              </div>
              {libEntry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={14} fill={libEntry.liked ? '#ff4466' : 'none'}
                    style={{ color: libEntry.liked ? '#ff4466' : 'var(--lv-muted)' }} />
                  <span style={{ fontSize: 12, color: 'var(--lv-muted)' }}>
                    {libEntry.liked ? 'Curtido' : 'Curtir'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {(item.uris?.[0]?.startsWith('magnet:') || item.seasons?.some(s => s.uri?.startsWith('magnet:'))) && (
              <button
                onClick={() => {
                  const uri = item.uris?.[0] ?? item.seasons?.find(s => s.uri?.startsWith('magnet:'))?.uri ?? ''
                  setStreamUri(uri)
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'oklch(0.85 0.17 90 / 0.10)',
                  color: 'var(--brand-yellow)',
                  border: '1px solid oklch(0.85 0.17 90 / 0.30)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Play size={15} fill="currentColor" /> Reproduzir
              </button>
            )}
            <button
              onClick={() => setWatchOpen(true)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 12,
                background: 'var(--brand-yellow)', color: '#0d111a',
                fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
              }}
            >
              <Play size={16} fill="#0d111a" style={{ color: '#0d111a' }} /> Onde assistir
            </button>
            {libEntry && (
              <>
                <button
                  onClick={handleLike}
                  style={{
                    width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12, border: '1px solid var(--divider)', cursor: 'pointer',
                    background: libEntry.liked ? '#ff446618' : 'var(--chip)',
                  }}
                >
                  <Heart size={20} fill={libEntry.liked ? '#ff4466' : 'none'}
                    style={{ color: libEntry.liked ? '#ff4466' : 'var(--lv-muted)' }} />
                </button>
                <button
                  onClick={handleWatched}
                  style={{
                    width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12, border: '1px solid var(--divider)', cursor: 'pointer',
                    background: libEntry.watched ? '#22c55e18' : 'var(--chip)',
                  }}
                >
                  <Eye size={20} style={{ color: libEntry.watched ? '#22c55e' : 'var(--lv-muted)' }} />
                </button>
              </>
            )}
          </div>

          {/* ── Cast ──────────────────────────────────────────────────────── */}
          {detail?.cast && detail.cast.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--lv-text)', margin: 0 }}>Elenco</h3>
                <span style={{ fontSize: 13, color: 'var(--lv-muted)' }}>
                  {detail.cast.length} atores
                </span>
              </div>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {(detail.cast as CastMember[]).map((c) => (
                  <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, width: 82 }}>
                    {/* Large square photo */}
                    <div style={{
                      width: 82, height: 82, borderRadius: 14, overflow: 'hidden',
                      background: 'var(--panel-2)', border: '1px solid var(--divider)',
                    }}>
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--lv-muted)', textAlign: 'center', lineHeight: 1.3, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.name}
                    </p>
                    {c.character && (
                      <p style={{ fontSize: 10, color: 'oklch(0.45 0.01 240)', textAlign: 'center', margin: '-4px 0 0', lineHeight: 1.2,
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.character}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Synopsis ──────────────────────────────────────────────────── */}
          {detail?.description && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 10px' }}>Sinopse</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--lv-muted)', margin: 0 }}>
                {detail.description}
              </p>
            </div>
          )}

          {loading && !detail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="skeleton" style={{ height: 18, width: '40%' }} />
              <div className="skeleton" style={{ height: 28, width: '80%' }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
              <div className="skeleton" style={{ height: 100, width: '100%' }} />
            </div>
          )}

          {/* ── Genres (all) ─────────────────────────────────────────────── */}
          {genres.length > 2 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 8px' }}>Gêneros</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {genres.map(g => (
                  <span key={g} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 20,
                    background: 'var(--chip)', color: 'var(--lv-muted)',
                    border: '1px solid var(--divider)',
                  }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Director / Author ─────────────────────────────────────────── */}
          {detail?.developer && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: 0 }}>
                {category === 'books' ? 'Autor' : (category as string) === 'games' ? 'Desenvolvedora' : 'Direção / Criação'}
                {': '}
                <span style={{ color: 'var(--lv-text)', fontWeight: 600 }}>{detail.developer}</span>
              </p>
            </div>
          )}

          {/* ── Where to watch ────────────────────────────────────────────── */}
          {detail?.streamingServices && detail.streamingServices.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 10px' }}>Onde assistir</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.streamingServices.map(s => (
                  <a key={s.name} href={s.url ?? '#'} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 12,
                      background: 'var(--panel)', border: '1px solid var(--divider)',
                      textDecoration: 'none',
                    }}>
                    {s.logo && <img src={s.logo} alt={s.name} style={{ width: 20, height: 20, borderRadius: 4 }} />}
                    <span style={{ fontSize: 13, color: 'var(--lv-text)' }}>{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Trailer ──────────────────────────────────────────────────── */}
          {detail?.trailerUrl && (
            <div style={{ marginBottom: 20 }}>
              <a href={detail.trailerUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                  background: 'var(--panel)', border: '1px solid var(--divider)',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'oklch(0.85 0.17 90 / 0.12)', border: '1px solid oklch(0.85 0.17 90 / 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Play size={14} fill="var(--brand-yellow)" style={{ color: 'var(--brand-yellow)', marginLeft: 2 }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Assistir trailer</p>
                  <p style={{ fontSize: 11, color: 'var(--lv-muted)', margin: 0 }}>Abre no YouTube</p>
                </div>
                <ExternalLink size={14} style={{ color: 'var(--lv-muted)', marginLeft: 'auto' }} />
              </a>
            </div>
          )}

          {/* ── Buy links ─────────────────────────────────────────────────── */}
          {detail?.buyLinks && detail.buyLinks.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 10px' }}>Links</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.buyLinks.map(l => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 13,
                      background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)',
                    }}>
                    <ExternalLink size={12} /> {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Seasons & Episodes ──────────────────────────────────────────────── */}
          {(item.seasons?.length || detail?.tmdbSeasons?.length) ? (
            <SeriesEpisodesSection
              addonSeasons={item.seasons ?? []}
              tmdbSeasons={detail?.tmdbSeasons ?? []}
              onStream={(uri) => setStreamUri(uri)}
            />
          ) : null}

          {/* ── Comments ─────────────────────────────────────────────────── */}
          {ck && user && (
            <div style={{ marginTop: 8 }}>
              <Comments contentKey={ck} currentUserId={user.id} />
            </div>
          )}
        </div>
      </div>

      {streamUri && (
        <TorrentPlayer
          magnetUri={streamUri}
          title={title}
          onClose={() => setStreamUri(null)}
        />
      )}

      {watchOpen && (
        <WatchOptionsSheet
          title={title}
          streamingServices={detail?.streamingServices ?? []}
          trailerUrl={detail?.trailerUrl ?? null}
          magnetUri={item.uris?.[0] ?? item.seasons?.[0]?.uri ?? null}
          onStream={(uri) => { setStreamUri(uri); setWatchOpen(false) }}
          onClose={() => setWatchOpen(false)}
        />
      )}
    </div>
  )
}
