/**
 * TorrentPlayer — streams a magnet URI directly in the browser via WebTorrent.
 *
 * WebTorrent uses WebRTC for peer connections; the video is served progressively
 * as pieces arrive. Seeking only works correctly on formats with early index
 * metadata (MP4, WebM). MKV/AVI may not seek until fully buffered.
 */
import { useEffect, useRef, useState } from 'react'
import { X, Wifi, Users, ArrowDownCircle } from 'lucide-react'
import { localTrackerStore } from '../../utils/localStore'

interface TorrentPlayerProps {
  magnetUri: string
  title: string
  onClose: () => void
}

interface TorrentStats {
  progress: number      // 0–1
  downloadSpeed: number // bytes/s
  numPeers: number
  downloaded: number    // bytes
  total: number         // bytes
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

function fmtSpeed(b: number): string {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB/s`
  return `${(b / 1024 ** 2).toFixed(1)} MB/s`
}

const CONNECTING_MSGS = [
  'Procurando seeders no abismo…',
  'Acordando os torrents do sono eterno…',
  'Negociando com peers desconhecidos…',
  'Invocando o espírito da internet…',
  'Chamando reforços da rede…',
  'Tentando convencer alguém a compartilhar…',
  'Vasculhando a matrix em busca de peers…',
]

const BUFFERING_MSGS = [
  'Enchendo o balde de bits…',
  'Juntando os pedaços do puzzle…',
  'Baixando os fotogramas um a um…',
  'Preparando o cinema particular…',
  'Quase lá, aguenta mais um segundo…',
  'Carregando os pixels com carinho…',
]

const connectingMsg = CONNECTING_MSGS[Math.floor(Date.now() / 1000) % CONNECTING_MSGS.length]
const bufferingMsg  = BUFFERING_MSGS[Math.floor(Date.now() / 1000)  % BUFFERING_MSGS.length]

/** Returns all wss:// tracker URLs found in a magnet URI */
function extractWssTrackers(magnet: string): string[] {
  const matches = magnet.match(/[&?]tr=([^&]+)/g) ?? []
  return matches
    .map(m => decodeURIComponent(m.replace(/^[&?]tr=/, '')))
    .filter(t => t.startsWith('wss://'))
}

export function TorrentPlayer({ magnetUri, title, onClose }: TorrentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null)
  const [phase, setPhase] = useState<'connecting' | 'buffering' | 'playing' | 'error'>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stats, setStats] = useState<TorrentStats | null>(null)
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const peerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let destroyed = false

    const start = async () => {
      try {
        // Dynamic import so WebTorrent is only loaded when the player is opened
        const { default: WebTorrent } = await import('webtorrent')

        if (destroyed) return

        const customTrackers = localTrackerStore.get()

        // Build full magnet with custom trackers appended first,
        // so we can check if there are any wss:// trackers before connecting.
        let fullMagnet = magnetUri
        for (const tr of customTrackers) {
          if (!fullMagnet.includes(encodeURIComponent(tr))) {
            fullMagnet += `&tr=${encodeURIComponent(tr)}`
          }
        }

        // WebTorrent in the browser uses WebRTC only — it cannot use udp:// or http:// trackers.
        // Without at least one wss:// tracker, no peers will ever be found.
        const wssTrackers = extractWssTrackers(fullMagnet)
        if (wssTrackers.length === 0) {
          setPhase('error')
          setErrorMsg(
            'Este magnet não contém trackers WebSocket (wss://). ' +
            'O Abyss Web roda no navegador e usa WebRTC — ' +
            'trackers udp:// e http:// não funcionam no browser. ' +
            'Adicione um tracker WSS nas ⚙️ Configurações → Trackers para habilitar a reprodução.'
          )
          return
        }

        const client = new WebTorrent({
          tracker: {
            rtcConfig: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun.cloudflare.com:3478' },
              ],
            },
          },
        })
        clientRef.current = client

        client.on('error', (err: unknown) => {
          if (!destroyed) { setPhase('error'); setErrorMsg(String(err)) }
        })

        const torrent = client.add(fullMagnet, { path: undefined })

        // Timeout: if no peers after 30s, show a helpful error
        peerTimeoutRef.current = setTimeout(() => {
          if (destroyed || torrent.numPeers > 0 || torrent.downloaded > 0) return
          setPhase('error')
          setErrorMsg('Nenhum peer encontrado após 30 segundos. Este torrent pode não ter seeders ativos. Tente adicionar trackers personalizados nas configurações.')
        }, 30000)

        torrent.on('error', (err: unknown) => {
          if (!destroyed) { setPhase('error'); setErrorMsg(String(err)) }
        })

        torrent.on('ready', () => {
          if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
          if (destroyed || !videoRef.current) return

          // Find the largest video file in the torrent
          const videoExts = /\.(mp4|webm|mkv|avi|mov|m4v|ts|m2ts)$/i
          const file = [...torrent.files]
            .filter((f) => videoExts.test(f.name))
            .sort((a, b) => b.length - a.length)[0]

          if (!file) {
            setPhase('error')
            setErrorMsg('Nenhum arquivo de vídeo encontrado no torrent.')
            return
          }

          setPhase('buffering')

          // renderTo works for MP4/WebM; for MKV we append to body temporarily
          file.renderTo(videoRef.current!, { autoplay: true }, (err: unknown) => {
            if (err) { setPhase('error'); setErrorMsg(String(err)) }
            else      { setPhase('playing') }
          })

          // Poll stats every second
          statsRef.current = setInterval(() => {
            if (!destroyed) {
              setStats({
                progress:      torrent.progress,
                downloadSpeed: torrent.downloadSpeed,
                numPeers:      torrent.numPeers,
                downloaded:    torrent.downloaded,
                total:         torrent.length,
              })
            }
          }, 1000)
        })

      } catch (err) {
        if (!destroyed) {
          setPhase('error')
          setErrorMsg(`Erro ao carregar WebTorrent: ${String(err)}`)
        }
      }
    }

    start()

    return () => {
      destroyed = true
      if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
      if (statsRef.current) clearInterval(statsRef.current)
      clientRef.current?.destroy()
      clientRef.current = null
    }
  }, [magnetUri])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.96)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--divider)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <button onClick={onClose} style={{
          background: 'var(--chip)', border: '1px solid var(--divider)',
          borderRadius: '50%', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <X size={16} style={{ color: 'var(--lv-text)' }} />
        </button>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <video
          ref={videoRef}
          controls
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: phase === 'error' ? 'none' : 'block' }}
        />

        {/* Overlay states */}
        {(phase === 'connecting' || phase === 'buffering') && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'rgba(0,0,0,0.7)',
          }}>
            {/* Spinner */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid var(--divider)',
              borderTopColor: 'var(--brand-yellow)',
              animation: 'spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: 'var(--lv-text)', fontSize: 14, fontWeight: 500 }}>
              {phase === 'connecting' ? connectingMsg : bufferingMsg}
            </p>
            {stats && (
              <p style={{ color: 'var(--lv-muted)', fontSize: 12 }}>
                {stats.numPeers} peers · {fmtSpeed(stats.downloadSpeed)}
              </p>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: 32, textAlign: 'center',
          }}>
            <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 600 }}>Erro ao reproduzir</p>
            <p style={{ color: 'var(--lv-muted)', fontSize: 13 }}>{errorMsg}</p>
            <p style={{ color: 'var(--lv-muted)', fontSize: 12, maxWidth: 320 }}>
              Dica: para melhor compatibilidade, arquivos MP4 e WebM funcionam melhor no navegador. MKV pode ter suporte limitado.
            </p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats && phase !== 'error' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '8px 16px', flexShrink: 0,
          borderTop: '1px solid var(--divider)',
          background: 'var(--panel)',
        }}>
          {/* Progress */}
          <div style={{ flex: 1, height: 3, background: 'var(--chip)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.progress * 100}%`, background: 'var(--brand-yellow)', transition: 'width 0.5s' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--lv-muted)' }}>
              <ArrowDownCircle size={12} /> {fmtSpeed(stats.downloadSpeed)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--lv-muted)' }}>
              <Users size={12} /> {stats.numPeers}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--lv-muted)' }}>
              <Wifi size={12} /> {(stats.progress * 100).toFixed(1)}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--lv-muted)' }}>
              {fmtBytes(stats.downloaded)} / {fmtBytes(stats.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
