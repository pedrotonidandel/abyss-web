import type { ContentCategory } from '../types'
import { API, TMDB_KEY } from './apiConfig'

// Lightweight data shown in catalog rows
export interface ApiEnrichment {
  cover: string | null    // portrait poster
  backdrop: string | null // wide landscape image
  genres: string[]
  rating: number | null
}

export interface CastMember {
  name: string
  character: string
  photo: string | null
}

export interface StreamingProvider {
  name: string
  logo: string | null
  url: string | null
}

export interface TmdbSeasonEp {
  number:  number
  title:   string
  airDate: string | null
  still:   string | null  // episode thumbnail URL
}

export interface TmdbSeason {
  seasonNumber: number
  episodes: TmdbSeasonEp[]
}

const STREAMING_SEARCH_URLS: Record<string, string> = {
  'Netflix':              'https://www.netflix.com/search?q=',
  'Amazon Prime Video':   'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
  'Prime Video':          'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
  'Disney Plus':          'https://www.disneyplus.com/search/',
  'Disney+':              'https://www.disneyplus.com/search/',
  'Star Plus':            'https://www.starplus.com/search/',
  'Star+':                'https://www.starplus.com/search/',
  'Max':                  'https://play.max.com/search?q=',
  'HBO Max':              'https://play.max.com/search?q=',
  'Apple TV Plus':        'https://tv.apple.com/search?term=',
  'Apple TV+':            'https://tv.apple.com/search?term=',
  'Paramount Plus':       'https://www.paramountplus.com/br/search/',
  'Paramount+':           'https://www.paramountplus.com/br/search/',
  'Globoplay':            'https://globoplay.globo.com/busca/?q=',
  'Mubi':                 'https://mubi.com/pt/search/films?query=',
  'Telecine Play':        'https://www.telecine.com.br/busca?q=',
  'Crunchyroll':          'https://www.crunchyroll.com/pt-br/search?q=',
  'Looke':                'https://www.looke.com.br/busca/',
  'Claro video':          'https://www.clarovideo.com/brasil/busca?q=',
  'Funimation':           'https://www.funimation.com/search/?q=',
  'Lionsgate Plus':       'https://www.lionsgateplus.com/search?q=',
}

// Full data for the detail page
export interface ApiDetail extends ApiEnrichment {
  title: string
  description: string
  releaseDate: string | null
  developer: string | null  // developer / director / author
  buyLinks: { label: string; url: string }[]
  trailerUrl: string | null  // YouTube embed URL
  cast: CastMember[]
  streamingServices: StreamingProvider[]
  tmdbId?: number           // store resolved TMDB ID
  runtime?: number          // runtime in minutes (movies)
  voteCount?: number        // number of TMDB votes
  tmdbSeasons?: TmdbSeason[] // for series/animes
}

// Item returned by the TMDB catalog browser
export interface CatalogItem {
  id: number
  title: string
  cover: string | null
  backdrop: string | null
  genres: string[]
  rating: number | null
  releaseDate: string | null
  overview: string
  category: ContentCategory
}

// TMDB genre ID maps (avoids an extra /genre/list API call)
const MOVIE_GENRES: Record<number, string> = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia',
  36: 'História', 27: 'Terror', 10402: 'Música', 9648: 'Mistério',
  10749: 'Romance', 878: 'Ficção Científica', 53: 'Suspense',
  10752: 'Guerra', 37: 'Faroeste',
}
const TV_GENRES: Record<number, string> = {
  10759: 'Ação & Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
  99: 'Documentário', 18: 'Drama', 10751: 'Família', 10762: 'Kids',
  9648: 'Mistério', 10764: 'Reality', 10765: 'Sci-Fi & Fantasia',
  10767: 'Talk Show', 10768: 'Guerra & Política', 37: 'Faroeste',
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function youtubeTrailer(videos: { results: { type: string; site: string; key: string }[] }): string | null {
  const trailer = videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube')
    ?? videos.results.find((v) => v.site === 'YouTube')
  return trailer ? `${API.youtubeEmbed}/${trailer.key}?rel=0` : null
}

// ─── Lightweight fetch (catalog enrichment — one API call per item) ───────────

export async function fetchEnrichment(
  title: string,
  category: ContentCategory,
): Promise<ApiEnrichment | null> {
  if (!TMDB_KEY) return null
  const q = encodeURIComponent(title)
  try {
    if (category === 'movies') {
      const data = await fetchJson<{ results: Record<string, unknown>[] }>(
        `${API.tmdbApi}/search/movie?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
      )
      const m = data.results?.[0]
      if (!m) return null
      return {
        cover: m.poster_path ? `${API.tmdbImg}/w500${m.poster_path as string}` : null,
        backdrop: m.backdrop_path ? `${API.tmdbImg}/w1280${m.backdrop_path as string}` : null,
        genres: ((m.genre_ids as number[]) ?? []).map((id) => MOVIE_GENRES[id]).filter(Boolean),
        rating: m.vote_average ? (m.vote_average as number) / 2 : null,
      }
    }
    if (category === 'series') {
      const data = await fetchJson<{ results: Record<string, unknown>[] }>(
        `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
      )
      const s = data.results?.[0]
      if (!s) return null
      return {
        cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
        backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
        genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
        rating: s.vote_average ? (s.vote_average as number) / 2 : null,
      }
    }
    if (category === 'animes') {
      const data = await fetchJson<{ results: Record<string, unknown>[] }>(
        `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
      )
      const all = data.results ?? []
      const isAnime = (r: Record<string, unknown>) => {
        const oc = (r.origin_country as string[] | undefined) ?? []
        const ol = r.original_language as string | undefined
        const gids = (r.genre_ids as number[] | undefined) ?? []
        return oc.includes('JP') || ol === 'ja' || gids.includes(16)
      }
      const s = (all.find(isAnime) ?? all[0]) as Record<string, unknown> | undefined
      if (!s) return null
      return {
        cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
        backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
        genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
        rating: s.vote_average ? (s.vote_average as number) / 2 : null,
      }
    }
    if (category === 'books') {
      const data = await fetchJson<{ docs: Record<string, unknown>[] }>(
        `${API.openLibraryApi}/search.json?title=${q}&limit=1`
      )
      const b = data.docs?.[0]
      if (!b) return null
      return {
        cover: b.cover_i ? `${API.openLibraryCovers}/${b.cover_i as number}-L.jpg` : null,
        backdrop: null,
        genres: ((b.subject as string[] | undefined) ?? []).slice(0, 5),
        rating: null,
      }
    }
  } catch { /* network or parse error — return null */ }
  return null
}

// ─── Full fetch (detail page) ─────────────────────────────────────────────────

export async function fetchDetail(
  title: string,
  category: ContentCategory,
  tmdbId?: number,
): Promise<ApiDetail | null> {
  if (!TMDB_KEY && category !== 'books') return null
  const q = encodeURIComponent(title)
  try {
    const buildCast = (credits: { cast: { name: string; character: string; profile_path: string | null }[] }): CastMember[] =>
      (credits.cast ?? []).slice(0, 10).map((a) => ({
        name: a.name,
        character: a.character,
        photo: a.profile_path ? `${API.tmdbImg}/w185${a.profile_path}` : null,
      }))

    const buildStreaming = (
      provData: { link?: string; flatrate?: { provider_name: string; logo_path: string | null }[] },
      nameForUrl: string,
    ): { services: StreamingProvider[]; justWatchUrl: string | null } => {
      const justWatchUrl: string | null = provData.link ?? null
      const flatrate = (provData.flatrate ?? []).filter(
        (p) => !/with ads/i.test(p.provider_name)
      )
      const services: StreamingProvider[] = flatrate.slice(0, 8).map((p) => {
        const base = STREAMING_SEARCH_URLS[p.provider_name]
        return {
          name: p.provider_name,
          logo: p.logo_path ? `${API.tmdbImg}/w92${p.logo_path}` : null,
          url: base ? base + encodeURIComponent(nameForUrl) : justWatchUrl,
        }
      })
      return { services, justWatchUrl }
    }

    // ── Movies ────────────────────────────────────────────────────────────────
    if (category === 'movies') {
      if (!TMDB_KEY) return null
      let movieId = tmdbId
      if (!movieId) {
        const search = await fetchJson<{ results: { id: number }[] }>(
          `${API.tmdbApi}/search/movie?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
        )
        movieId = search.results?.[0]?.id
        if (!movieId) return null
      }
      const [detail, videos, credits, providers] = await Promise.all([
        fetchJson<Record<string, unknown>>(`${API.tmdbApi}/movie/${movieId}?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/movie/${movieId}/videos?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ cast: { name: string; character: string; profile_path: string | null }[] }>(`${API.tmdbApi}/movie/${movieId}/credits?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results?: Record<string, { link?: string; flatrate?: { provider_name: string; logo_path: string | null }[] }> }>(`${API.tmdbApi}/movie/${movieId}/watch/providers?api_key=${TMDB_KEY}`),
      ])
      let trailerUrl = youtubeTrailer(videos)
      if (!trailerUrl) {
        try {
          const vidEn = await fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/movie/${movieId}/videos?api_key=${TMDB_KEY}&language=en-US`)
          trailerUrl = youtubeTrailer(vidEn)
        } catch { /* ok */ }
      }
      const provBR = providers.results?.BR ?? {}
      const { services: streamingServices } = buildStreaming(provBR, detail.title as string)
      return {
        cover: detail.poster_path ? `${API.tmdbImg}/w500${detail.poster_path as string}` : null,
        backdrop: detail.backdrop_path ? `${API.tmdbImg}/w1280${detail.backdrop_path as string}` : null,
        title: detail.title as string,
        description: (detail.overview as string) ?? '',
        rating: detail.vote_average ? (detail.vote_average as number) / 2 : null,
        voteCount: (detail.vote_count as number | null) ?? undefined,
        genres: ((detail.genres as { name: string }[]) ?? []).map((g) => g.name),
        releaseDate: (detail.release_date as string) ?? null,
        developer: (detail.production_companies as { name: string }[] | undefined)?.[0]?.name ?? null,
        trailerUrl,
        cast: buildCast(credits),
        streamingServices,
        buyLinks: [],
        tmdbId: movieId,
        runtime: (detail.runtime as number | null) ?? undefined,
      }
    }

    // ── Series ────────────────────────────────────────────────────────────────
    if (category === 'series') {
      if (!TMDB_KEY) return null
      let seriesId = tmdbId
      if (!seriesId) {
        const search = await fetchJson<{ results: { id: number }[] }>(
          `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
        )
        seriesId = search.results?.[0]?.id
        if (!seriesId) return null
      }
      const [detail, videos, credits, providers] = await Promise.all([
        fetchJson<Record<string, unknown>>(`${API.tmdbApi}/tv/${seriesId}?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/tv/${seriesId}/videos?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ cast: { name: string; character: string; profile_path: string | null }[] }>(`${API.tmdbApi}/tv/${seriesId}/credits?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results?: Record<string, { link?: string; flatrate?: { provider_name: string; logo_path: string | null }[] }> }>(`${API.tmdbApi}/tv/${seriesId}/watch/providers?api_key=${TMDB_KEY}`),
      ])
      let trailerUrl = youtubeTrailer(videos)
      if (!trailerUrl) {
        try {
          const vidEn = await fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/tv/${seriesId}/videos?api_key=${TMDB_KEY}&language=en-US`)
          trailerUrl = youtubeTrailer(vidEn)
        } catch { /* ok */ }
      }
      const seriesTitle = (detail.name ?? detail.original_name) as string
      const provBR = providers.results?.BR ?? {}
      const { services: streamingServices } = buildStreaming(provBR, seriesTitle)
      const numberOfSeasons = Math.min((detail.number_of_seasons as number) ?? 1, 5)
      const seasonNums = Array.from({ length: numberOfSeasons }, (_, i) => i + 1)
      const tmdbSeasons: TmdbSeason[] = await Promise.all(
        seasonNums.map(async (n) => {
          try {
            const s = await fetchJson<{ episodes: { episode_number: number; name: string; air_date: string | null; still_path: string | null }[] }>(
              `${API.tmdbApi}/tv/${seriesId}/season/${n}?api_key=${TMDB_KEY}&language=pt-BR`
            )
            return {
              seasonNumber: n,
              episodes: (s.episodes ?? []).map(ep => ({
                number: ep.episode_number,
                title: ep.name,
                airDate: ep.air_date ?? null,
                still: ep.still_path ? `${API.tmdbImg}/w300${ep.still_path}` : null,
              }))
            }
          } catch { return { seasonNumber: n, episodes: [] } }
        })
      )
      return {
        cover: detail.poster_path ? `${API.tmdbImg}/w500${detail.poster_path as string}` : null,
        backdrop: detail.backdrop_path ? `${API.tmdbImg}/w1280${detail.backdrop_path as string}` : null,
        title: seriesTitle,
        description: (detail.overview as string) ?? '',
        rating: detail.vote_average ? (detail.vote_average as number) / 2 : null,
        genres: ((detail.genres as { name: string }[]) ?? []).map((g) => g.name),
        releaseDate: (detail.first_air_date as string) ?? null,
        developer: (detail.created_by as { name: string }[] | undefined)?.[0]?.name ?? null,
        trailerUrl,
        cast: buildCast(credits),
        streamingServices,
        buyLinks: [],
        tmdbId: seriesId,
        tmdbSeasons,
      }
    }

    // ── Animes ────────────────────────────────────────────────────────────────
    if (category === 'animes') {
      if (!TMDB_KEY) return null
      let animeId = tmdbId
      if (!animeId) {
        const search = await fetchJson<{ results: Record<string, unknown>[] }>(
          `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR`
        )
        const all = search.results ?? []
        const isAnime = (r: Record<string, unknown>) => {
          const oc = (r.origin_country as string[] | undefined) ?? []
          const ol = r.original_language as string | undefined
          const gids = (r.genre_ids as number[] | undefined) ?? []
          return oc.includes('JP') || ol === 'ja' || gids.includes(16)
        }
        const found = (all.find(isAnime) ?? all[0]) as Record<string, unknown> | undefined
        animeId = found?.id as number | undefined
        if (!animeId) return null
      }
      const [detail, videos, credits, providers] = await Promise.all([
        fetchJson<Record<string, unknown>>(`${API.tmdbApi}/tv/${animeId}?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/tv/${animeId}/videos?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ cast: { name: string; character: string; profile_path: string | null }[] }>(`${API.tmdbApi}/tv/${animeId}/credits?api_key=${TMDB_KEY}&language=pt-BR`),
        fetchJson<{ results?: Record<string, { link?: string; flatrate?: { provider_name: string; logo_path: string | null }[] }> }>(`${API.tmdbApi}/tv/${animeId}/watch/providers?api_key=${TMDB_KEY}`),
      ])
      let trailerUrl = youtubeTrailer(videos)
      if (!trailerUrl) {
        for (const lang of ['ja', 'en-US']) {
          try {
            const vid = await fetchJson<{ results: { type: string; site: string; key: string }[] }>(`${API.tmdbApi}/tv/${animeId}/videos?api_key=${TMDB_KEY}&language=${lang}`)
            trailerUrl = youtubeTrailer(vid)
            if (trailerUrl) break
          } catch { /* ok */ }
        }
      }
      const animeTitle = (detail.name ?? detail.original_name) as string
      const eq = encodeURIComponent(animeTitle)
      const provBR = providers.results?.BR ?? {}
      const { services: streamingServices } = buildStreaming(provBR, animeTitle)
      const animeNumberOfSeasons = Math.min((detail.number_of_seasons as number) ?? 1, 5)
      const animeSeasonNums = Array.from({ length: animeNumberOfSeasons }, (_, i) => i + 1)
      const tmdbSeasons: TmdbSeason[] = await Promise.all(
        animeSeasonNums.map(async (n) => {
          try {
            const s = await fetchJson<{ episodes: { episode_number: number; name: string; air_date: string | null; still_path: string | null }[] }>(
              `${API.tmdbApi}/tv/${animeId}/season/${n}?api_key=${TMDB_KEY}&language=pt-BR`
            )
            return {
              seasonNumber: n,
              episodes: (s.episodes ?? []).map(ep => ({
                number: ep.episode_number,
                title: ep.name,
                airDate: ep.air_date ?? null,
                still: ep.still_path ? `${API.tmdbImg}/w300${ep.still_path}` : null,
              }))
            }
          } catch { return { seasonNumber: n, episodes: [] } }
        })
      )
      return {
        cover: detail.poster_path ? `${API.tmdbImg}/w500${detail.poster_path as string}` : null,
        backdrop: detail.backdrop_path ? `${API.tmdbImg}/w1280${detail.backdrop_path as string}` : null,
        title: animeTitle,
        description: (detail.overview as string) ?? '',
        rating: detail.vote_average ? (detail.vote_average as number) / 2 : null,
        genres: ((detail.genres as { name: string }[]) ?? []).map((g) => g.name),
        releaseDate: (detail.first_air_date as string) ?? null,
        developer: (detail.created_by as { name: string }[] | undefined)?.[0]?.name ?? (detail.production_companies as { name: string }[] | undefined)?.[0]?.name ?? null,
        trailerUrl,
        cast: buildCast(credits),
        streamingServices,
        buyLinks: [{ label: 'MyAnimeList', url: `https://myanimelist.net/anime.php?q=${eq}` }],
        tmdbId: animeId,
        tmdbSeasons,
      }
    }

    // ── Books (Open Library) ──────────────────────────────────────────────────
    const data = await fetchJson<{ docs: Record<string, unknown>[] }>(
      `${API.openLibraryApi}/search.json?title=${q}&limit=1`
    )
    const b = data.docs?.[0]
    if (!b) return null
    const eq = encodeURIComponent(b.title as string)
    const firstSentence = typeof b.first_sentence === 'string'
      ? b.first_sentence : ((b.first_sentence as { value?: string } | undefined)?.value ?? '')
    return {
      cover: b.cover_i ? `${API.openLibraryCovers}/${b.cover_i as number}-L.jpg` : null,
      backdrop: null,
      title: b.title as string,
      description: firstSentence,
      rating: null,
      genres: ((b.subject as string[] | undefined) ?? []).slice(0, 6),
      releaseDate: b.first_publish_year ? String(b.first_publish_year) : null,
      developer: (b.author_name as string[] | undefined)?.[0] ?? null,
      trailerUrl: null,
      cast: [],
      streamingServices: [],
      buyLinks: [
        { label: 'Open Library', url: `${API.openLibraryApi}/search?title=${eq}` },
        { label: 'Amazon', url: `https://www.amazon.com.br/s?k=${eq}` },
      ],
    }
  } catch { /* network or parse error */ }
  return null
}

// ─── Catalog search ────────────────────────────────────────────────────────────

export async function fetchCatalogSearch(
  category: ContentCategory,
  query: string,
  page: number,
): Promise<{ items: CatalogItem[]; totalPages: number }> {
  if (!TMDB_KEY && category !== 'books') return { items: [], totalPages: 0 }
  const q = encodeURIComponent(query)
  try {
    if (category === 'movies') {
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(
        `${API.tmdbApi}/search/movie?api_key=${TMDB_KEY}&query=${q}&language=pt-BR&page=${page}`
      )
      return {
        items: (data.results ?? []).map((m) => ({
          id: m.id as number,
          title: m.title as string,
          cover: m.poster_path ? `${API.tmdbImg}/w500${m.poster_path as string}` : null,
          backdrop: m.backdrop_path ? `${API.tmdbImg}/w1280${m.backdrop_path as string}` : null,
          genres: ((m.genre_ids as number[]) ?? []).map((id) => MOVIE_GENRES[id]).filter(Boolean),
          rating: m.vote_average ? (m.vote_average as number) / 2 : null,
          releaseDate: (m.release_date as string) ?? null,
          overview: (m.overview as string) ?? '',
          category: 'movies' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
    if (category === 'series') {
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(
        `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR&page=${page}`
      )
      return {
        items: (data.results ?? []).map((s) => ({
          id: s.id as number,
          title: (s.name ?? s.original_name) as string,
          cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
          backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
          genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
          rating: s.vote_average ? (s.vote_average as number) / 2 : null,
          releaseDate: (s.first_air_date as string) ?? null,
          overview: (s.overview as string) ?? '',
          category: 'series' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
    if (category === 'animes') {
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(
        `${API.tmdbApi}/search/tv?api_key=${TMDB_KEY}&query=${q}&language=pt-BR&page=${page}`
      )
      const isAnime = (r: Record<string, unknown>) => {
        const oc = (r.origin_country as string[] | undefined) ?? []
        const ol = r.original_language as string | undefined
        const gids = (r.genre_ids as number[] | undefined) ?? []
        return oc.includes('JP') || ol === 'ja' || gids.includes(16)
      }
      const filtered = (data.results ?? []).filter(isAnime)
      return {
        items: filtered.map((s) => ({
          id: s.id as number,
          title: (s.name ?? s.original_name) as string,
          cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
          backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
          genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
          rating: s.vote_average ? (s.vote_average as number) / 2 : null,
          releaseDate: (s.first_air_date as string) ?? null,
          overview: (s.overview as string) ?? '',
          category: 'animes' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
  } catch { /* network/API error */ }
  return { items: [], totalPages: 0 }
}

// ─── Catalog page fetch ────────────────────────────────────────────────────────

export type CatalogListType = 'popular' | 'top_rated' | 'trending' | 'new_releases'

export async function fetchCatalogPage(
  category: ContentCategory,
  page: number,
  listType: CatalogListType = 'popular',
): Promise<{ items: CatalogItem[]; totalPages: number }> {
  if (!TMDB_KEY) return { items: [], totalPages: 0 }
  try {
    if (category === 'movies') {
      const tmdbMovieType = listType === 'new_releases' ? 'now_playing' : listType
      const endpoint = tmdbMovieType === 'trending'
        ? `${API.tmdbApi}/trending/movie/week?api_key=${TMDB_KEY}&language=pt-BR&page=${page}`
        : `${API.tmdbApi}/movie/${tmdbMovieType}?api_key=${TMDB_KEY}&language=pt-BR&page=${page}`
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(endpoint)
      return {
        items: (data.results ?? []).map((m) => ({
          id: m.id as number,
          title: m.title as string,
          cover: m.poster_path ? `${API.tmdbImg}/w500${m.poster_path as string}` : null,
          backdrop: m.backdrop_path ? `${API.tmdbImg}/w1280${m.backdrop_path as string}` : null,
          genres: ((m.genre_ids as number[]) ?? []).map((id) => MOVIE_GENRES[id]).filter(Boolean),
          rating: m.vote_average ? (m.vote_average as number) / 2 : null,
          releaseDate: (m.release_date as string) ?? null,
          overview: (m.overview as string) ?? '',
          category: 'movies' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
    if (category === 'series') {
      const tmdbTvType = listType === 'new_releases' ? 'on_the_air' : listType
      const endpoint = tmdbTvType === 'trending'
        ? `${API.tmdbApi}/trending/tv/week?api_key=${TMDB_KEY}&language=pt-BR&page=${page}`
        : `${API.tmdbApi}/tv/${tmdbTvType}?api_key=${TMDB_KEY}&language=pt-BR&page=${page}`
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(endpoint)
      return {
        items: (data.results ?? []).map((s) => ({
          id: s.id as number,
          title: (s.name ?? s.original_name) as string,
          cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
          backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
          genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
          rating: s.vote_average ? (s.vote_average as number) / 2 : null,
          releaseDate: (s.first_air_date as string) ?? null,
          overview: (s.overview as string) ?? '',
          category: 'series' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
    if (category === 'animes') {
      const sort = listType === 'top_rated'
        ? 'vote_average.desc&vote_count.gte=200'
        : 'popularity.desc'
      const endpoint = `${API.tmdbApi}/discover/tv?api_key=${TMDB_KEY}` +
        `&with_genres=16&with_origin_country=JP&language=pt-BR&page=${page}&sort_by=${sort}`
      const data = await fetchJson<{ results: Record<string, unknown>[]; total_pages: number }>(endpoint)
      return {
        items: (data.results ?? []).map((s) => ({
          id: s.id as number,
          title: (s.name ?? s.original_name) as string,
          cover: s.poster_path ? `${API.tmdbImg}/w500${s.poster_path as string}` : null,
          backdrop: s.backdrop_path ? `${API.tmdbImg}/w1280${s.backdrop_path as string}` : null,
          genres: ((s.genre_ids as number[]) ?? []).map((id) => TV_GENRES[id]).filter(Boolean),
          rating: s.vote_average ? (s.vote_average as number) / 2 : null,
          releaseDate: (s.first_air_date as string) ?? null,
          overview: (s.overview as string) ?? '',
          category: 'animes' as const,
        })),
        totalPages: Math.min((data.total_pages) ?? 1, 500),
      }
    }
  } catch { /* API error */ }
  return { items: [], totalPages: 0 }
}
