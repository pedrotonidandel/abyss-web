import type { DownloadItem } from '../types'

// Stores addon source URLs keyed by addon ID
export const localAddonUrlStore = {
  get:    (id: string) => localStorage.getItem(`abyss.addonUrl.${id}`),
  set:    (id: string, url: string) => localStorage.setItem(`abyss.addonUrl.${id}`, url),
  remove: (id: string) => localStorage.removeItem(`abyss.addonUrl.${id}`),
}

// Stores file-based addon content keyed by addon ID
export const localAddonStore = {
  get:    (id: string): DownloadItem[] | null => {
    const raw = localStorage.getItem(`abyss.addon.${id}`)
    return raw ? JSON.parse(raw) as DownloadItem[] : null
  },
  set:    (id: string, items: DownloadItem[]) => localStorage.setItem(`abyss.addon.${id}`, JSON.stringify(items)),
  remove: (id: string) => localStorage.removeItem(`abyss.addon.${id}`),
}

// Stores magnet URIs for content the user wants to stream locally
// keyed by a simple slug (e.g. title+category hash or contentKey)
export const localMagnetStore = {
  get:    (key: string): string | null => localStorage.getItem(`abyss.magnet.${key}`),
  set:    (key: string, uri: string) => localStorage.setItem(`abyss.magnet.${key}`, uri),
  remove: (key: string) => localStorage.removeItem(`abyss.magnet.${key}`),
}

// Default tracker list — hardcoded fallback when user has no custom trackers.
// Browser WebRTC only connects via wss:// trackers; udp:// and http:// are
// silently ignored in the browser but kept here for completeness (the lock-app
// Electron build can use them via native BitTorrent).
const DEFAULT_TRACKERS = [
  // ── WebSocket trackers (wss://) — work in browser + Electron ──────────────
  'wss://tracker.btorrent.xyz',
  'wss://tracker.btorrent.xyz:443',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  // ── UDP trackers — work in Electron only ──────────────────────────────────
  'udp://tracker.opentrackr.org:1337/announce',
  // ── HTTP trackers — work in Electron only ─────────────────────────────────
  'http://retracker.krs-ix.ru/announce',
  'http://retracker.krs-ix.ru:80/announce',
  'http://secure.pow7.com/announce',
  'http://t1.pow7.com/announce',
  'http://t2.pow7.com/announce',
  'http://thetracker.org:80/announce',
  'http://torrent.gresille.org/announce',
  'http://torrentsmd.com:8080/announce',
  'http://tracker.aletorrenty.pl:2710/announce',
]

// Real-Debrid API key — used to resolve magnets via RD servers (bypasses WebRTC limitation).
export const realDebridStore = {
  getKey:   (): string | null => localStorage.getItem('abyss.rdKey'),
  setKey:   (key: string)     => localStorage.setItem('abyss.rdKey', key),
  clearKey: ()                => localStorage.removeItem('abyss.rdKey'),
}

// Custom tracker list (appended to every torrent started by the PWA).
// Falls back to DEFAULT_TRACKERS so torrents work without manual setup.
export const localTrackerStore = {
  get: (): string[] => {
    try {
      const raw = localStorage.getItem('abyss.customTrackers')
      return raw ? (JSON.parse(raw) as string[]) : DEFAULT_TRACKERS
    } catch { return DEFAULT_TRACKERS }
  },
  set: (trackers: string[]) => localStorage.setItem('abyss.customTrackers', JSON.stringify(trackers)),
  defaults: DEFAULT_TRACKERS,
}
