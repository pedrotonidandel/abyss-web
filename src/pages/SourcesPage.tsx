import { useState, useRef } from 'react'
import { ArrowLeft, Plus, Trash2, Link, Upload, RefreshCw, Package } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { localAddonStore, localAddonUrlStore } from '../utils/localStore'
import type { ContentCategory, AddonManifest, Source, DownloadItem } from '../types'

const CATEGORY_OPTIONS: { value: ContentCategory; label: string; color: string }[] = [
  { value: 'movies',  label: 'Filmes', color: '#e5a00d' },
  { value: 'series',  label: 'Séries', color: '#00b4ff' },
  { value: 'animes',  label: 'Animes', color: '#a855f7' },
  { value: 'books',   label: 'Livros', color: '#22c55e' },
]

function parseAddonJson(json: unknown): DownloadItem[] {
  const data = json as Record<string, unknown>
  if (!data.name || !Array.isArray(data.downloads)) {
    throw new Error('JSON inválido: precisa ter "name" e "downloads[]"')
  }
  return data.downloads as DownloadItem[]
}

interface SourcesPageProps {
  onBack: () => void
}

export function SourcesPage({ onBack }: SourcesPageProps) {
  const { sources, setSources } = useAppStore()
  const [url, setUrl]           = useState('')
  const [category, setCategory] = useState<ContentCategory>('movies')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showSuccess = (msg: string) => {
    setSuccess(msg); setTimeout(() => setSuccess(null), 3000)
  }

  // ── Add a source ─────────────────────────────────────────────────────────
  const addSource = async (downloads: DownloadItem[], name: string, sourceUrl: string | null) => {
    const manifest: AddonManifest = {
      id:      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      category,
      url:     sourceUrl,
      addedAt: new Date().toISOString(),
    }

    if (!sourceUrl) {
      localAddonStore.set(manifest.id, downloads)
    } else {
      localAddonUrlStore.set(manifest.id, sourceUrl)
    }

    await api.sources.create(manifest)
    const source: Source = { ...manifest, downloads }
    setSources([source, ...sources])
    return source
  }

  // ── URL load ──────────────────────────────────────────────────────────────
  const handleUrlLoad = async () => {
    if (!url.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(url.trim())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as unknown
      const downloads = parseAddonJson(data)
      const name = (data as Record<string, unknown>).name as string
      const source = await addSource(downloads, name, url.trim())
      showSuccess(`"${source.name}" adicionado com ${downloads.length} itens`)
      setUrl('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── File load ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target!.result as string) as unknown
        const downloads = parseAddonJson(data)
        const name = (data as Record<string, unknown>).name as string
        const source = await addSource(downloads, name, null)
        showSuccess(`"${source.name}" importado com ${downloads.length} itens`)
      } catch (e) {
        setError((e as Error).message)
      }
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Refresh (re-fetch URL addon) ──────────────────────────────────────────
  const handleRefresh = async (source: Source) => {
    const addonUrl = source.url ?? localAddonUrlStore.get(source.id)
    if (!addonUrl) return
    setRefreshingId(source.id)
    try {
      const res = await fetch(addonUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { downloads?: DownloadItem[] }
      const downloads = Array.isArray(data.downloads) ? data.downloads : []
      setSources(sources.map((s) => s.id === source.id ? { ...s, downloads } : s))
      showSuccess(`"${source.name}" atualizado (${downloads.length} itens)`)
    } catch (e) {
      setError(`Erro ao atualizar: ${(e as Error).message}`)
    } finally {
      setRefreshingId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (source: Source) => {
    setDeletingId(source.id)
    try {
      await api.sources.remove(source.id)
      localAddonUrlStore.remove(source.id)
      localAddonStore.remove(source.id)
      setSources(sources.filter((s) => s.id !== source.id))
    } catch (e) {
      setError(`Erro ao remover: ${(e as Error).message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--chip)', border: '1px solid var(--divider)',
    borderRadius: 10, color: 'var(--lv-text)', fontSize: 14, outline: 'none',
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--divider)', background: 'var(--panel)' }}>
        <button onClick={onBack} className="p-2 rounded-full"
          style={{ background: 'var(--chip)', border: '1px solid var(--divider)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--lv-text)' }} />
        </button>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Addons</h2>
          <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>{sources.length} fonte{sources.length !== 1 ? 's' : ''} ativa{sources.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">

        {/* ── Add by URL ──────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--divider)', borderRadius: 16, padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Link size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Adicionar por URL</span>
          </div>

          {/* Category selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: category === opt.value ? `${opt.color}20` : 'var(--chip)',
                  color: category === opt.value ? opt.color : 'var(--lv-muted)',
                  borderColor: category === opt.value ? `${opt.color}40` : 'var(--divider)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="https://addon.example.com/source.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
              onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
            />
            <button
              onClick={handleUrlLoad}
              disabled={loading || !url.trim()}
              style={{
                padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: loading || !url.trim() ? 'var(--chip)' : 'var(--brand-yellow)',
                color: loading || !url.trim() ? 'var(--lv-muted)' : '#0d111a',
                border: '1px solid var(--divider)', cursor: loading || !url.trim() ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              {loading ? '…' : <Plus size={18} />}
            </button>
          </div>

          {/* File upload */}
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              marginTop: 10, width: '100%', padding: '9px 0',
              background: 'transparent', border: '1px dashed var(--divider)',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'var(--lv-muted)', fontSize: 13,
            }}
          >
            <Upload size={14} /> Importar arquivo JSON
          </button>
        </div>

        {/* ── Feedback ─────────────────────────────────────────────────────── */}
        {error && (
          <p style={{ fontSize: 13, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ fontSize: 13, color: '#22c55e', padding: '8px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
            ✓ {success}
          </p>
        )}

        {/* ── Source list ──────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--lv-text)' }}>Fontes instaladas</h3>

          {sources.length === 0 ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <Package size={36} style={{ color: 'var(--lv-muted)', opacity: 0.4 }} />
              <p style={{ fontSize: 14, color: 'var(--lv-muted)' }}>Nenhum addon adicionado</p>
              <p style={{ fontSize: 12, color: 'var(--lv-muted)', opacity: 0.7 }}>
                Adicione uma URL de addon acima para começar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map((source) => {
                const catColor = CATEGORY_OPTIONS.find((c) => c.value === source.category)?.color ?? '#888'
                const isUrl = !!(source.url ?? localAddonUrlStore.get(source.id))
                return (
                  <div key={source.id} style={{
                    background: 'var(--panel)', border: '1px solid var(--divider)',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {/* Category dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {source.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--lv-muted)', margin: 0 }}>
                        {source.downloads.length} item{source.downloads.length !== 1 ? 's' : ''} · {isUrl ? 'URL' : 'Arquivo local'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isUrl && (
                        <button
                          onClick={() => handleRefresh(source)}
                          disabled={refreshingId === source.id}
                          title="Atualizar"
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--divider)',
                            background: 'var(--chip)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <RefreshCw size={14} style={{
                            color: 'var(--lv-muted)',
                            animation: refreshingId === source.id ? 'spin 0.9s linear infinite' : 'none',
                          }} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(source)}
                        disabled={deletingId === source.id}
                        title="Remover"
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                          background: 'rgba(239,68,68,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Format hint */}
        <div style={{ padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--divider)', borderRadius: 12 }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--lv-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Formato esperado
          </p>
          <pre style={{ fontSize: 11, color: 'var(--lv-muted)', margin: 0, overflowX: 'auto', lineHeight: 1.5 }}>{`{
  "name": "Meu Addon",
  "downloads": [
    {
      "title": "Filme X",
      "uris": ["magnet:?xt=urn:btih:..."],
      "uploadDate": "2024-01-01",
      "fileSize": "4.2 GB"
    }
  ]
}`}</pre>
        </div>
      </div>
    </div>
  )
}
