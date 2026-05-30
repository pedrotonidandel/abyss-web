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

// Public WSS trackers that support WebTorrent (WebRTC) out of the box.
// Used as defaults when the user hasn't configured any custom trackers.
const DEFAULT_WSS_TRACKERS = [
  'wss://tracker.btorrent.xyz',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
]

// Custom tracker list (appended to every torrent started by the PWA).
// Falls back to DEFAULT_WSS_TRACKERS so torrents work without manual setup.
export const localTrackerStore = {
  get: (): string[] => {
    try {
      const raw = localStorage.getItem('abyss.customTrackers')
      return raw ? (JSON.parse(raw) as string[]) : DEFAULT_WSS_TRACKERS
    } catch { return DEFAULT_WSS_TRACKERS }
  },
  set: (trackers: string[]) => localStorage.setItem('abyss.customTrackers', JSON.stringify(trackers)),
  defaults: DEFAULT_WSS_TRACKERS,
}
