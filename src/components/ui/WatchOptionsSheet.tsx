import { X, Play, ExternalLink, Tv } from 'lucide-react'
import type { StreamingProvider } from '../../utils/fetchApiData'

interface WatchOptionsSheetProps {
  title: string
  streamingServices: StreamingProvider[]
  trailerUrl: string | null
  /** Primary URI — can be a magnet link or a direct https:// stream URL */
  magnetUri?: string | null
  onStream?: (uri: string) => void // callback to open TorrentPlayer
  onClose: () => void
}

export function WatchOptionsSheet({
  title, streamingServices, trailerUrl, magnetUri, onStream, onClose
}: WatchOptionsSheetProps) {
  const hasOptions = streamingServices.length > 0 || magnetUri || trailerUrl
  const isMagnet = magnetUri?.startsWith('magnet:')

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--panel)',
        borderRadius: '20px 20px 0 0',
        border: '1px solid var(--divider)',
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'oklch(0.35 0.012 235)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 20px 16px',
          borderBottom: '1px solid var(--divider)',
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--lv-text)', margin: 0 }}>
              Onde assistir
            </h3>
            <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: '3px 0 0' }}>{title}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--chip)', border: '1px solid var(--divider)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} style={{ color: 'var(--lv-muted)' }} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Streaming services */}
          {streamingServices.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
                Streaming disponível
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {streamingServices.map(s => (
                  <a
                    key={s.name}
                    href={s.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 14,
                      background: 'var(--panel-2)', border: '1px solid var(--divider)',
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}
                  >
                    {s.logo ? (
                      <img src={s.logo} alt={s.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--chip)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Tv size={16} style={{ color: 'var(--lv-muted)' }} />
                      </div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', flex: 1 }}>{s.name}</span>
                    <ExternalLink size={14} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Stream button — works for both magnet links and direct video URLs */}
          {magnetUri && onStream && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
                {isMagnet ? 'Via torrent' : 'Stream direto'}
              </p>
              <button
                onClick={() => { onStream(magnetUri); onClose() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 14,
                  background: 'oklch(0.85 0.17 90 / 0.10)',
                  border: '1px solid oklch(0.85 0.17 90 / 0.30)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play size={18} fill="#0d111a" style={{ color: '#0d111a', marginLeft: 2 }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-yellow)', margin: 0 }}>
                    {isMagnet ? 'Reproduzir via torrent' : 'Reproduzir stream'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--lv-muted)', margin: '2px 0 0' }}>
                    {isMagnet ? 'Transmite enquanto baixa' : 'Reprodução direta via link'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Trailer */}
          {trailerUrl && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
                Trailer
              </p>
              <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 14,
                  background: 'var(--panel-2)', border: '1px solid var(--divider)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play size={14} fill="rgba(255,80,80,0.9)" style={{ color: 'rgba(255,80,80,0.9)', marginLeft: 2 }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--lv-text)' }}>Assistir trailer no YouTube</span>
                <ExternalLink size={14} style={{ color: 'var(--lv-muted)', marginLeft: 'auto', flexShrink: 0 }} />
              </a>
            </div>
          )}

          {!hasOptions && (
            <p style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, color: 'var(--lv-muted)' }}>
              Nenhuma opção de exibição encontrada.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
