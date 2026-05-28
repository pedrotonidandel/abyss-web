/**
 * Computes a blind content identifier for library entries and comments.
 * The server never stores human-readable titles — only this opaque key.
 *
 * Priority:
 *   t:<tmdbId>   — TMDB ID (movies / series / animes)
 *   <32-hex>     — SHA-256 of "normalised_title|category" (addon-only items)
 */
export async function contentKey(
  title: string,
  category: string,
  tmdbId?: number | null,
): Promise<string> {
  if (tmdbId) return `t:${tmdbId}`
  const msg = `${title.toLowerCase().trim()}|${category}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}
