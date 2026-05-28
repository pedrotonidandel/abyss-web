import type { DownloadItem } from '../types'

// Stores addon source URLs keyed by addon ID (same as Electron app's localAddonUrlStore)
export const localAddonUrlStore = {
  get: (id: string) => localStorage.getItem(`abyss.addonUrl.${id}`),
  set: (id: string, url: string) => localStorage.setItem(`abyss.addonUrl.${id}`, url),
  remove: (id: string) => localStorage.removeItem(`abyss.addonUrl.${id}`),
}
// Stores file-based addon content keyed by addon ID
export const localAddonStore = {
  get: (id: string): DownloadItem[] | null => {
    const raw = localStorage.getItem(`abyss.addon.${id}`)
    return raw ? JSON.parse(raw) as DownloadItem[] : null
  },
  set: (id: string, items: DownloadItem[]) => localStorage.setItem(`abyss.addon.${id}`, JSON.stringify(items)),
  remove: (id: string) => localStorage.removeItem(`abyss.addon.${id}`),
}
