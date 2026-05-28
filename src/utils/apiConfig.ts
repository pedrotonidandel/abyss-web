// External API endpoints — externalized via Vite env vars so deployments can
// retarget to mirrors / mocks without touching code. Every value falls back to
// the public production URL so the app still works if .env is missing.

export const API = {
  tmdbApi:           (import.meta.env.VITE_TMDB_API_BASE as string | undefined)           ?? 'https://api.themoviedb.org/3',
  tmdbImg:           (import.meta.env.VITE_TMDB_IMAGE_BASE as string | undefined)         ?? 'https://image.tmdb.org/t/p',
  openLibraryApi:    (import.meta.env.VITE_OPENLIBRARY_API_BASE as string | undefined)    ?? 'https://openlibrary.org',
  openLibraryCovers: (import.meta.env.VITE_OPENLIBRARY_COVERS_BASE as string | undefined) ?? 'https://covers.openlibrary.org/b/id',
  youtubeEmbed:      (import.meta.env.VITE_YOUTUBE_EMBED_BASE as string | undefined)      ?? 'https://www.youtube.com/embed',
}

// Helper for TMDB poster/backdrop URLs since they are used in many places.
export const tmdbImage = (path: string, size: 'w500' | 'w1280' = 'w500') =>
  `${API.tmdbImg}/${size}${path}`

// TMDB API key from env
export const TMDB_KEY = (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ?? ''
