import { useEffect, useRef, useState } from 'react'
import { localTrackerStore } from '../../utils/localStore'
import { VideoPlayer } from './VideoPlayer'

interface TorrentPlayerProps {
  magnetUri: string
  title: string
  onClose: () => void
}

interface TorrentStats {
  progress: number
  downloadSpeed: number
  numPeers: number
  downloaded: number
  total: number
}

type Phase = 'connecting' | 'buffering' | 'playing' | 'error'

const CONNECTING_MSGS = [
  'Procurando seeders no abismo…',
  'Acordando os torrents do sono eterno…',
  'Negociando com peers desconhecidos…',
  'Invocando o espírito da internet…',
  'Chamando reforços da rede…',
  'Vasculhando a matrix em busca de peers…',
]
const BUFFERING_MSGS = [
  'Carregando o conteúdo…',
  'Juntando os pedaços do puzzle…',
  'Preparando o cinema particular…',
  'Quase lá, aguenta…',
]

const connectingMsg = CONNECTING_MSGS[Math.floor(Date.now() / 1000) % CONNECTING_MSGS.length]
const bufferingMsg  = BUFFERING_MSGS[Math.floor(Date.now() / 1000) % BUFFERING_MSGS.length]

function extractWssTrackers(magnet: string): string[] {
  const matches = magnet.match(/[&?]tr=([^&]+)/g) ?? []
  return matches
    .map(m => decodeURIComponent(m.replace(/^[&?]tr=/, '')))
    .filter(t => t.startsWith('wss://'))
}

/**
 * MSE só funciona de forma confiável para WebM (formato de streaming nativo).
 * MP4 regular não é fMP4 (fragmented), então MSE falha com MEDIA_ERR_SRC_NOT_SUPPORTED.
 * Para MP4/MKV/outros usamos blob após download completo.
 */
function getMseType(name: string): string | null {
  if (typeof MediaSource === 'undefined') return null
  if (/\.webm$/i.test(name)) {
    return (
      ['video/webm; codecs="vp9,opus"', 'video/webm; codecs="vp8,vorbis"', 'video/webm']
        .find(t => MediaSource.isTypeSupported(t)) ?? null
    )
  }
  return null
}

// ICE servers: STUN + TURN públicos para máxima conectividade.
// TURN é essencial em redes com NAT simétrico (maioria dos celulares/3G/4G/5G).
const ICE_SERVERS: RTCIceServer[] = [
  // Google STUN
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Cloudflare STUN
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Twilio STUN
  { urls: 'stun:global.stun.twilio.com:3478' },
  // OpenRelay TURN público (metered.ca) — permite conexão mesmo atrás de NAT simétrico
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

async function streamViaMSE(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file: any,
  mimeType: string,
  video: HTMLVideoElement,
  isDestroyed: () => boolean,
  onPlaying: () => void,
): Promise<void> {
  const ms = new MediaSource()
  const objectURL = URL.createObjectURL(ms)
  video.src = objectURL

  try {
    await new Promise<void>((resolve, reject) => {
      ms.addEventListener('sourceopen', async () => {
        let sb: SourceBuffer
        try {
          sb = ms.addSourceBuffer(mimeType)
        } catch (e) { reject(e); return }

        const waitUpdate = () =>
          new Promise<void>(r => sb.addEventListener('updateend', () => r(), { once: true }))

        const evictOld = async () => {
          if (sb.updating) await waitUpdate()
          const evictTo = Math.max(0, video.currentTime - 45)
          if (sb.buffered.length > 0 && sb.buffered.start(0) < evictTo) {
            try { sb.remove(0, evictTo); await waitUpdate() } catch { /* ignore */ }
          }
        }

        video.addEventListener('canplay', () => {
          if (!isDestroyed()) { onPlaying(); video.play().catch(() => {}) }
        }, { once: true })

        const reader = (file.stream() as ReadableStream<Uint8Array>).getReader()
        try {
          while (true) {
            if (isDestroyed()) { reader.cancel(); break }
            const { done, value } = await reader.read()
            if (done) {
              if (sb.updating) await waitUpdate()
              if (ms.readyState === 'open') ms.endOfStream()
              resolve(); break
            }
            if (sb.updating) await waitUpdate()
            try {
              sb.appendBuffer(value); await waitUpdate()
            } catch (e) {
              if ((e as DOMException).name === 'QuotaExceededError') {
                await evictOld()
                if (sb.updating) await waitUpdate()
                try { sb.appendBuffer(value); await waitUpdate() } catch { /* skip */ }
              } else { reject(e); return }
            }
          }
        } catch (e) { reject(e) }
      }, { once: true })
      ms.addEventListener('error', () => reject(new Error('MediaSource error')), { once: true })
    })
  } finally {
    URL.revokeObjectURL(objectURL)
  }
}

async function streamViaBlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file: any,
  video: HTMLVideoElement,
  isDestroyed: () => boolean,
  onPlaying: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const chunks: Uint8Array[] = []
  const reader = (file.stream() as ReadableStream<Uint8Array>).getReader()
  let blobURL: string | null = null
  try {
    while (true) {
      if (isDestroyed()) { reader.cancel(); return }
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    if (isDestroyed()) return
    const blob = new Blob(chunks, { type: file.type || 'video/mp4' })
    blobURL = URL.createObjectURL(blob)
    video.src = blobURL
    await video.play()
    onPlaying()
  } catch (e) {
    if (blobURL) URL.revokeObjectURL(blobURL)
    if (!isDestroyed()) onError(`Erro ao reproduzir: ${String(e)}`)
  }
}

export function TorrentPlayer({ magnetUri, title, onClose }: TorrentPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef   = useRef<any>(null)
  const destroyedRef = useRef(false)

  const [phase, setPhase]       = useState<Phase>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stats, setStats]       = useState<TorrentStats | null>(null)
  const [connectMsg, setConnectMsg] = useState(connectingMsg)

  const statsIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const peerTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    destroyedRef.current = false
    const isDestroyed = () => destroyedRef.current

    const start = async () => {
      try {
        const { default: WebTorrent } = await import('webtorrent')
        if (isDestroyed()) return

        // Collect all wss:// trackers (custom + defaults)
        const allTrackers = localTrackerStore.get()
        const wssTrackers = allTrackers.filter(t => t.startsWith('wss://'))

        // Build full magnet appending any tracker not already present
        let fullMagnet = magnetUri
        for (const tr of allTrackers) {
          if (!fullMagnet.includes(encodeURIComponent(tr)) && !fullMagnet.includes(tr)) {
            fullMagnet += `&tr=${encodeURIComponent(tr)}`
          }
        }

        // Also collect wss:// trackers already embedded in the magnet
        const magnetWss = extractWssTrackers(fullMagnet)
        const announceList = [...new Set([...wssTrackers, ...magnetWss])]

        if (announceList.length === 0) {
          setPhase('error')
          setErrorMsg(
            'Nenhum tracker WebSocket (wss://) encontrado. ' +
            'O browser usa WebRTC — adicione trackers wss:// em Configurações → Trackers.'
          )
          return
        }

        const client = new WebTorrent({
          tracker: {
            rtcConfig: { iceServers: ICE_SERVERS },
          },
        })
        clientRef.current = client

        client.on('error', (err: unknown) => {
          if (!isDestroyed()) { setPhase('error'); setErrorMsg(String(err)) }
        })

        // Pass trackers both in magnet URI and explicitly via announce
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const torrent = client.add(fullMagnet, { announce: announceList } as any)

        // Progressive status messages while searching for peers
        const statusTimers = [
          setTimeout(() => { if (!isDestroyed() && phase !== 'buffering' && phase !== 'playing') setConnectMsg('Conectando aos trackers WSS…') }, 5000),
          setTimeout(() => { if (!isDestroyed() && phase !== 'buffering' && phase !== 'playing') setConnectMsg('Aguardando peers WebRTC… (pode demorar em redes móveis)') }, 15000),
          setTimeout(() => { if (!isDestroyed() && phase !== 'buffering' && phase !== 'playing') setConnectMsg('Ainda tentando… verifique se o conteúdo tem seeders WebRTC') }, 35000),
          setTimeout(() => { if (!isDestroyed() && phase !== 'buffering' && phase !== 'playing') setConnectMsg('Última tentativa via TURN relay…') }, 55000),
        ]

        // Generous 90-second timeout — TURN relay pode precisar de mais tempo
        peerTimeoutRef.current = setTimeout(() => {
          if (isDestroyed() || torrent.numPeers > 0 || torrent.downloaded > 0) return
          statusTimers.forEach(clearTimeout)
          setPhase('error')
          setErrorMsg(
            'Nenhum peer WebRTC encontrado em 90 segundos.\n\n' +
            'Causas possíveis:\n' +
            '• O torrent não tem seeders com suporte a WebRTC (necessário para browser)\n' +
            '• Rede muito restritiva bloqueando WebRTC (tente em outra rede)\n' +
            '• Todos os trackers wss:// estão offline\n\n' +
            `Trackers tentados: ${announceList.join(', ')}`
          )
        }, 90000)

        torrent.on('warning', (warn: unknown) => {
          console.warn('[TorrentPlayer] warning:', warn)
        })

        torrent.on('error', (err: unknown) => {
          if (!isDestroyed()) { setPhase('error'); setErrorMsg(String(err)) }
        })

        // Update connecting message when tracker announces
        torrent.on('trackerAnnounce', () => {
          if (!isDestroyed() && phase === 'connecting') {
            setConnectMsg('Tracker conectado — procurando peers WebRTC…')
          }
        })

        // Show peer count as soon as first peer connects
        torrent.on('wire', () => {
          if (!isDestroyed() && phase === 'connecting') {
            setConnectMsg('Peer encontrado! Baixando metadados…')
          }
        })

        torrent.on('ready', async () => {
          peerTimeoutRef.current && clearTimeout(peerTimeoutRef.current)
          statusTimers.forEach(clearTimeout)
          if (isDestroyed() || !videoRef.current) return

          const videoExts = /\.(mp4|webm|mkv|avi|mov|m4v|ts|m2ts)$/i
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const files: any[] = [...torrent.files]
          const file = files
            .filter(f => videoExts.test(f.name))
            .sort((a, b) => b.length - a.length)[0]

          if (!file) {
            setPhase('error')
            setErrorMsg('Nenhum arquivo de vídeo encontrado neste torrent.')
            return
          }

          for (const f of files) f.deselect()
          file.select()

          setPhase('buffering')

          statsIntervalRef.current = setInterval(() => {
            if (!isDestroyed()) {
              setStats({
                progress:      torrent.progress,
                downloadSpeed: torrent.downloadSpeed,
                numPeers:      torrent.numPeers,
                downloaded:    torrent.downloaded,
                total:         torrent.length,
              })
            }
          }, 1000)

          const video    = videoRef.current!
          const onPlaying = () => { if (!isDestroyed()) setPhase('playing') }
          const onError   = (msg: string) => { if (!isDestroyed()) { setPhase('error'); setErrorMsg(msg) } }
          const mseType   = getMseType(file.name)

          if (mseType) {
            try {
              await streamViaMSE(file, mseType, video, isDestroyed, onPlaying)
            } catch {
              if (!isDestroyed()) {
                // Limpa qualquer erro do MSE antes do fallback
                video.removeAttribute('src')
                video.load()
                await streamViaBlob(file, video, isDestroyed, onPlaying, onError)
              }
            }
          } else {
            await streamViaBlob(file, video, isDestroyed, onPlaying, onError)
          }
        })

      } catch (err) {
        if (!destroyedRef.current) {
          setPhase('error')
          setErrorMsg(`Erro ao inicializar WebTorrent: ${String(err)}`)
        }
      }
    }

    start()

    return () => {
      destroyedRef.current = true
      if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
      clientRef.current?.destroy()
      clientRef.current = null
    }
  }, [magnetUri])

  return (
    <VideoPlayer
      videoRef={videoRef}
      title={title}
      phase={phase}
      stats={stats}
      connectingMsg={connectMsg}
      bufferingMsg={bufferingMsg}
      errorMsg={errorMsg}
      onClose={onClose}
    />
  )
}
