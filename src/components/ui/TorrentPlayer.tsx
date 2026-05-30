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

/** Returns the best MSE mime type for the file name, or null if unsupported. */
function getMseType(name: string): string | null {
  if (typeof MediaSource === 'undefined') return null
  if (/\.webm$/i.test(name)) {
    return (
      ['video/webm; codecs="vp9,opus"', 'video/webm; codecs="vp8,vorbis"', 'video/webm']
        .find(t => MediaSource.isTypeSupported(t)) ?? null
    )
  }
  if (/\.(mp4|m4v)$/i.test(name)) {
    return (
      [
        'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
        'video/mp4; codecs="avc1.64001E,mp4a.40.2"',
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4',
      ].find(t => MediaSource.isTypeSupported(t)) ?? null
    )
  }
  if (/\.ts$/i.test(name)) {
    return MediaSource.isTypeSupported('video/mp2t') ? 'video/mp2t' : null
  }
  return null
}

/**
 * Stream file into a MediaSource. Feeds chunks as they arrive from the torrent.
 * Evicts old buffered data so we never exhaust the SourceBuffer quota on large files.
 */
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
        } catch (e) {
          reject(e); return
        }

        const waitUpdate = () =>
          new Promise<void>(r => sb.addEventListener('updateend', () => r(), { once: true }))

        // Remove stale data from the beginning of the buffer to avoid QuotaExceededError
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
              // Drain any pending update, then signal end of stream
              if (sb.updating) await waitUpdate()
              if (ms.readyState === 'open') ms.endOfStream()
              resolve()
              break
            }

            // Wait if previous append is still in progress
            if (sb.updating) await waitUpdate()

            // Try appending; on quota error, evict old data and retry
            try {
              sb.appendBuffer(value)
              await waitUpdate()
            } catch (e) {
              if ((e as DOMException).name === 'QuotaExceededError') {
                await evictOld()
                if (sb.updating) await waitUpdate()
                try { sb.appendBuffer(value); await waitUpdate() } catch { /* skip chunk */ }
              } else {
                reject(e); return
              }
            }
          }
        } catch (e) {
          reject(e)
        }
      }, { once: true })

      ms.addEventListener('error', () => reject(new Error('MediaSource error')), { once: true })
    })
  } finally {
    URL.revokeObjectURL(objectURL)
  }
}

/**
 * Fallback: collect all chunks from the stream into a Blob, then play.
 * Updates download progress via onProgress callback.
 * Safe for formats not supported by MSE (MKV, AVI…).
 */
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

    const mimeType = file.type || 'video/mp4'
    const blob = new Blob(chunks, { type: mimeType })
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
  const videoRef = useRef<HTMLVideoElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null)
  const destroyedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stats, setStats] = useState<TorrentStats | null>(null)
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const peerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    destroyedRef.current = false
    const isDestroyed = () => destroyedRef.current

    const start = async () => {
      try {
        const { default: WebTorrent } = await import('webtorrent')
        if (isDestroyed()) return

        // Build magnet with custom wss:// trackers
        const customTrackers = localTrackerStore.get()
        let fullMagnet = magnetUri
        for (const tr of customTrackers) {
          if (!fullMagnet.includes(encodeURIComponent(tr))) {
            fullMagnet += `&tr=${encodeURIComponent(tr)}`
          }
        }

        const wssTrackers = extractWssTrackers(fullMagnet)
        if (wssTrackers.length === 0) {
          setPhase('error')
          setErrorMsg(
            'Nenhum tracker WebSocket (wss://) encontrado neste magnet. ' +
            'O browser usa WebRTC — trackers udp:// e http:// não funcionam. ' +
            'Adicione um tracker WSS em Configurações → Trackers (ex: wss://tracker.btorrent.xyz).'
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
          if (!isDestroyed()) { setPhase('error'); setErrorMsg(String(err)) }
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const torrent = client.add(fullMagnet) as any

        // No-peers timeout after 30s
        peerTimeoutRef.current = setTimeout(() => {
          if (isDestroyed() || torrent.numPeers > 0 || torrent.downloaded > 0) return
          setPhase('error')
          setErrorMsg(
            'Nenhum peer encontrado em 30 segundos. ' +
            'Verifique se o torrent tem seeders ativos ou adicione mais trackers nas Configurações.'
          )
        }, 30000)

        torrent.on('error', (err: unknown) => {
          if (!isDestroyed()) { setPhase('error'); setErrorMsg(String(err)) }
        })

        torrent.on('ready', async () => {
          if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
          if (isDestroyed() || !videoRef.current) return

          // Pick the largest video file
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

          // Prioritize the chosen file
          for (const f of files) f.deselect()
          file.select()

          setPhase('buffering')

          // Stats polling
          statsIntervalRef.current = setInterval(() => {
            if (!isDestroyed()) {
              setStats({
                progress: torrent.progress,
                downloadSpeed: torrent.downloadSpeed,
                numPeers: torrent.numPeers,
                downloaded: torrent.downloaded,
                total: torrent.length,
              })
            }
          }, 1000)

          const video = videoRef.current!
          const onPlaying = () => { if (!isDestroyed()) setPhase('playing') }
          const onError = (msg: string) => { if (!isDestroyed()) { setPhase('error'); setErrorMsg(msg) } }

          const mseType = getMseType(file.name)

          if (mseType) {
            try {
              await streamViaMSE(file, mseType, video, isDestroyed, onPlaying)
            } catch {
              // MSE failed (likely non-faststart MP4), fall back to blob
              if (!isDestroyed()) await streamViaBlob(file, video, isDestroyed, onPlaying, onError)
            }
          } else {
            // MKV, AVI, etc. — not MSE-compatible
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
      connectingMsg={connectingMsg}
      bufferingMsg={bufferingMsg}
      errorMsg={errorMsg}
      onClose={onClose}
    />
  )
}
