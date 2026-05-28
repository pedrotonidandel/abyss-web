import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Film, Tv, BookOpen, Sparkles, Star, ChevronRight, Search } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { fetchEnrichment } from '../utils/fetchApiData'
import type { ApiEnrichment } from '../utils/fetchApiData'
import type { ContentCategory, DownloadItem, Source } from '../types'

const CATEGORIES: { id: ContentCategory; label: string; color: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }[] = [
  { id: 'movies', label: 'Filmes',  color: '#e5a00d', icon: Film     },
  { id: 'series', label: 'Séries',  color: '#00b4ff', icon: Tv       },
  { id: 'books',  label: 'Livros',  color: '#22c55e', icon: BookOpen },
  { id: 'animes', label: 'Animes',  color: '#a855f7', icon: Sparkles },
]

interface Props {
  onOpenDetail: (item: DownloadItem, source: Source) => void
}

export function HomePage({ onOpenDetail }: Props) {
  const {
    sources, activeCategory, setActiveCategory,
    searchQuery, setSearchQuery,
    apiEnrichment, setApiEnrichment,
  } = useAppStore()

  const [heroIdx, setHeroIdx]           = useState(0)
  const [heroEnrichment, setHeroEnrichment] = useState<ApiEnrichment | null>(null)
  const heroScrollRef = useRef<HTMLDivElement>(null)

  // All items for the active category + search
  const allItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const out: { item: DownloadItem; source: Source }[] = []
    for (const src of sources) {
      if (src.category !== activeCategory) continue
      for (const item of src.downloads) {
        if (!q || item.title.toLowerCase().includes(q)) out.push({ item, source: src })
      }
    }
    return out
  }, [sources, activeCategory, searchQuery])

  const heroItems = allItems.slice(0, 6)
  const rowItems  = allItems.slice(0, 14)
  const catInfo   = CATEGORIES.find((c) => c.id === activeCategory)
  const hasAnySrc = sources.length > 0
  const hasCatSrc = sources.some((s) => s.category === activeCategory)

  // Fetch lightweight TMDB enrichment for the current hero item
  useEffect(() => {
    const hero = heroItems[heroIdx]
    if (!hero) { setHeroEnrichment(null); return }

    const key = `${hero.item.title}::${hero.item.category ?? activeCategory}`
    const cached = apiEnrichment[key]
    if (cached) { setHeroEnrichment(cached); return }

    let cancelled = false
    setHeroEnrichment(null)
    fetchEnrichment(hero.item.title, hero.item.category ?? activeCategory)
      .then((data) => {
        if (cancelled || !data) return
        setApiEnrichment(key, data)
        setHeroEnrichment(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [heroIdx, heroItems.length, activeCategory])

  // Track which card is centered in the scroll carousel
  const handleHeroScroll = useCallback(() => {
    if (!heroScrollRef.current) return
    const { scrollLeft, clientWidth } = heroScrollRef.current
    const step = clientWidth * 0.73  // card (70%) + gap (3%)
    const idx = Math.round(scrollLeft / step)
    setHeroIdx(Math.min(Math.max(0, idx), heroItems.length - 1))
  }, [heroItems.length])

  // Reset on category change
  useEffect(() => {
    setHeroIdx(0)
    if (heroScrollRef.current) heroScrollRef.current.scrollLeft = 0
  }, [activeCategory])

  const hero     = heroItems[heroIdx]
  const heroYear = hero?.item.uploadDate?.slice(0, 4) ?? null
  const heroCover = hero ? (heroEnrichment?.backdrop ?? hero.item.coverUrl ?? null) : null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0d0d0d' }}>

      {/* ── Category tabs + search ── */}
      <div className="shrink-0 pt-4 pb-3 px-4" style={{ background: '#0d0d0d' }}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: activeCategory === id ? '#ffffff' : '#181818',
                color:      activeCategory === id ? '#000000' : '#666',
                border:     activeCategory === id ? 'none'    : '1px solid #222',
                transition: 'background 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {hasCatSrc && (
          <div
            className="flex items-center gap-2 mt-3 rounded-xl px-3 py-2.5"
            style={{ background: '#161616', border: '1px solid #1e1e1e' }}
          >
            <Search size={15} style={{ color: '#444' }} />
            <input
              type="search"
              placeholder="Buscar…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#e0e0e0' }}
            />
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Empty states */}
        {!hasAnySrc ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
            <span className="text-4xl">📦</span>
            <p className="text-sm" style={{ color: '#555' }}>Nenhuma fonte adicionada ainda.</p>
          </div>
        ) : !hasCatSrc ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-8 text-center">
            {catInfo && <catInfo.icon size={40} style={{ color: catInfo.color }} />}
            <p className="text-sm" style={{ color: '#555' }}>Sem fontes para {catInfo?.label}.</p>
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 px-8">
            <p className="text-sm" style={{ color: '#555' }}>Nenhum resultado encontrado.</p>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════
                MOBILE HERO CAROUSEL (< md)
            ════════════════════════════════ */}
            {heroItems.length > 0 && (
              <div className="md:hidden mt-2">
                {/* Peek carousel */}
                <div
                  ref={heroScrollRef}
                  className="flex overflow-x-auto no-scrollbar"
                  style={{
                    scrollSnapType: 'x mandatory',
                    scrollPaddingLeft: '15%',
                    paddingRight: '15%',
                    WebkitOverflowScrolling: 'touch',
                  } as React.CSSProperties}
                  onScroll={handleHeroScroll}
                >
                  {heroItems.map(({ item, source }, i) => (
                    <div
                      key={`hero-${i}`}
                      style={{
                        flexShrink: 0,
                        width: '70%',
                        marginLeft: i === 0 ? '15%' : '3%',
                        scrollSnapAlign: 'start',
                      }}
                    >
                      <button
                        className="w-full active:scale-95 transition-transform"
                        style={{ borderRadius: 18, overflow: 'hidden', display: 'block' }}
                        onClick={() => onOpenDetail(item, source)}
                      >
                        <div
                          className="relative w-full"
                          style={{ aspectRatio: '2/3', background: '#1a1a1a', borderRadius: 18 }}
                        >
                          {(item.coverUrl ?? heroEnrichment?.backdrop) ? (
                            <img
                              src={item.coverUrl ?? heroEnrichment?.backdrop!}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              style={{ borderRadius: 18 }}
                              loading="eager"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                          )}
                          <div
                            className="absolute inset-0"
                            style={{ borderRadius: 18, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)' }}
                          />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Hero info below carousel */}
                {hero && (
                  <div className="px-4 pt-3">
                    {heroYear && (
                      <p className="text-xs mb-1" style={{ color: '#666' }}>{heroYear}</p>
                    )}
                    <h2 className="text-xl font-bold leading-tight" style={{ color: '#fff' }}>
                      {hero.item.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {heroEnrichment?.genres?.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="px-3 py-0.5 rounded-full text-xs"
                          style={{ background: '#1e1e1e', color: '#aaa', border: '1px solid #2a2a2a' }}
                        >
                          {g}
                        </span>
                      ))}
                      {heroEnrichment?.rating && (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#f59e0b' }}>
                          <Star size={11} fill="#f59e0b" /> {heroEnrichment.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Pagination dots */}
                    {heroItems.length > 1 && (
                      <div className="flex items-center gap-1.5 mt-3">
                        {heroItems.map((_, i) => (
                          <div
                            key={i}
                            className="rounded-full"
                            style={{
                              width: i === heroIdx ? 20 : 6,
                              height: 6,
                              background: i === heroIdx ? '#fff' : '#2a2a2a',
                              transition: 'width 0.2s, background 0.2s',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════
                TABLET HERO BANNER (md+)
            ════════════════════════════════ */}
            {hero && (
              <div className="hidden md:block mx-4 mt-4">
                <button
                  className="relative w-full overflow-hidden active:scale-[0.99] transition-transform"
                  style={{ borderRadius: 20, aspectRatio: '21/9' }}
                  onClick={() => onOpenDetail(hero.item, hero.source)}
                >
                  {heroCover ? (
                    <img
                      src={heroCover}
                      alt={hero.item.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                      <span className="text-6xl">🎬</span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-6"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}
                  >
                    {heroYear && <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{heroYear}</p>}
                    <h2 className="text-2xl font-bold" style={{ color: '#fff' }}>{hero.item.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      {heroEnrichment?.genres?.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="px-3 py-0.5 rounded-full text-xs"
                          style={{ background: 'rgba(255,255,255,0.15)', color: '#ddd', backdropFilter: 'blur(4px)' }}
                        >
                          {g}
                        </span>
                      ))}
                      {heroEnrichment?.rating && (
                        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: '#f59e0b' }}>
                          <Star size={12} fill="#f59e0b" /> {heroEnrichment.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Dots indicator for tablet carousel switching */}
                {heroItems.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-3 justify-center">
                    {heroItems.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setHeroIdx(i)}
                        className="rounded-full"
                        style={{
                          width: i === heroIdx ? 20 : 6,
                          height: 6,
                          background: i === heroIdx ? '#fff' : '#2a2a2a',
                          transition: 'width 0.2s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── "Para você" horizontal row ── */}
            {rowItems.length > 4 && (
              <div className="mt-7">
                <div className="flex items-center justify-between px-4 mb-3">
                  <h3 className="text-[15px] font-bold" style={{ color: '#e0e0e0' }}>Para você</h3>
                  <button className="flex items-center gap-0.5 text-xs" style={{ color: '#555' }}>
                    Ver todos <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
                  {rowItems.map(({ item, source }, i) => (
                    <button
                      key={`row-${i}`}
                      className="shrink-0 active:scale-95 transition-transform"
                      style={{ width: 90 }}
                      onClick={() => onOpenDetail(item, source)}
                    >
                      <div
                        className="w-full overflow-hidden"
                        style={{ aspectRatio: '2/3', background: '#1a1a1a', borderRadius: 12 }}
                      >
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            style={{ borderRadius: 12 }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── All items grid ── */}
            <div className="mt-7 px-4 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold" style={{ color: '#e0e0e0' }}>
                  {catInfo?.label ?? 'Todos'}
                </h3>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                {allItems.map(({ item, source }, i) => (
                  <button
                    key={`grid-${i}`}
                    className="flex flex-col text-left active:scale-95 transition-transform"
                    onClick={() => onOpenDetail(item, source)}
                  >
                    <div
                      className="w-full overflow-hidden"
                      style={{ aspectRatio: '2/3', background: '#1a1a1a', borderRadius: 10, marginBottom: 6 }}
                    >
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          style={{ borderRadius: 10 }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                      )}
                    </div>
                    <p
                      className="text-xs font-medium leading-tight line-clamp-2"
                      style={{ color: '#e0e0e0' }}
                    >
                      {item.title}
                    </p>
                    {item.uploadDate && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
                        {item.uploadDate.slice(0, 4)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
