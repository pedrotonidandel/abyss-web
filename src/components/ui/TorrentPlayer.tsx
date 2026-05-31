import { useEffect, useRef, useState } from 'react'
import { localTrackerStore, realDebridStore } from '../../utils/localStore'
import { resolveWithRealDebrid } from '../../utils/realDebrid'
import { VideoPlayer } from './VideoPlayer'

interface TorrentPlayerProps {
  /** Any playable URI: magnet link OR direct https:// video URL */
  uri: string
  /** Optional additional URIs to try if the first one fails */
  fallbackUris?: string[]
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

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
// Múltiplos provedores de TURN aumentam as chances de conexão.
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
  // OpenRelay TURN (metered.ca) — relay para NAT simétrico
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
  // FreeTURN — alternativa confiável
  { urls: 'stun:freeturn.net:3478' },
  {
    urls: 'turn:freeturn.net:3478',
    username: 'free',
    credential: 'free',
  },
  {
    urls: 'turn:freeturn.net:5349',
    username: 'free',
    credential: 'free',
  },
]

// Tempo máximo por tentativa antes de auto-retry
const ATTEMPT_TIMEOUT_MS = 70_000
// Quantas vezes reinicia automaticamente antes de mostrar o erro
const MAX_AUTO_RETRIES = 1

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

export function TorrentPlayer({ uri, fallbackUris = [], title, onClose }: TorrentPlayerProps) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef    = useRef<any>(null)
  const destroyedRef = useRef(false)

  const [phase, setPhase]       = useState<Phase>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stats, setStats]       = useState<TorrentStats | null>(null)
  const [connectMsg, setConnectMsg] = useState(() => pickRandom(CONNECTING_MSGS))
  const [bufferingMsg]              = useState(() => pickRandom(BUFFERING_MSGS))

  // Manual retry: incrementar para forçar re-execução do effect
  const [retryKey, setRetryKey] = useState(0)
  // Which URI in [uri, ...fallbackUris] we're currently trying
  const [uriIndex, setUriIndex] = useState(0)

  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const peerTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const rdAbortRef       = useRef<AbortController | null>(null)

  // All URIs in priority order
  const allUris = [uri, ...fallbackUris].filter(Boolean)
  const currentUri = allUris[uriIndex] ?? uri

  useEffect(() => {
    destroyedRef.current = false
    const isDestroyed = () => destroyedRef.current

    // Reseta UI ao iniciar/reiniciar
    setPhase('connecting')
    setErrorMsg(null)
    setStats(null)
    setConnectMsg(pickRandom(CONNECTING_MSGS))

    const showUriError = (msg: string) => {
      const hasMore = uriIndex < allUris.length - 1
      if (hasMore) {
        // Auto-switch to next URI
        const nextIndex = uriIndex + 1
        const nextUri = allUris[nextIndex]
        const isNextMagnet = nextUri?.startsWith('magnet:')
        setConnectMsg(`Tentando link alternativo${isNextMagnet ? ' (torrent)' : ''}…`)
        setTimeout(() => {
          if (!isDestroyed()) setUriIndex(nextIndex)
        }, 1500)
      } else {
        setPhase('error')
        setErrorMsg(msg)
      }
    }

    const start = async (attempt: number) => {
      const activeUri = currentUri
      if (!activeUri) {
        setPhase('error')
        setErrorMsg('Nenhum link de reprodução disponível.')
        return
      }

      // ── Direct HTTP/HTTPS video URL ─────────────────────────────────────────
      // Se não é magnet, tenta reproduzir diretamente no elemento <video>.
      // Isso funciona para URLs .mp4, .webm, .m3u8 (HLS — nativo no Safari/iOS),
      // e qualquer outro stream HTTP suportado pelo navegador.
      if (!activeUri.startsWith('magnet:')) {
        const video = videoRef.current
        if (!video || isDestroyed()) return

        setConnectMsg('Conectando ao servidor de stream…')

        let resolved = false
        const onCanPlay = () => {
          if (isDestroyed() || resolved) return
          resolved = true
          setPhase('playing')
          video.play().catch(() => {})
        }
        const onVideoError = () => {
          if (isDestroyed() || resolved) return
          resolved = true
          const code = video.error?.code ?? 0
          const msgs: Record<number, string> = {
            1: 'Reprodução interrompida pelo usuário.',
            2: 'Erro de rede ao carregar o vídeo.',
            3: 'Erro de decodificação — formato não suportado neste dispositivo.',
            4: 'Formato de vídeo não suportado ou URL inválida.',
          }
          showUriError(msgs[code] ?? `Erro ao carregar o vídeo (código ${code}).`)
        }

        video.addEventListener('canplay', onCanPlay, { once: true })
        video.addEventListener('error', onVideoError, { once: true })
        video.src = activeUri
        video.load()
        return
      }

      // ── Real-Debrid (magnet → URL HTTP direta) ─────────────────────────────
      // Se a chave RD estiver configurada, tenta resolver via RD primeiro.
      // RD usa servidores próprios com UDP, sem limitação de WebRTC.
      // Fallback para WebTorrent se RD falhar ou não estiver configurado.
      const rdKey = realDebridStore.getKey()
      if (rdKey) {
        const rdAbort = new AbortController()
        rdAbortRef.current = rdAbort
        try {
          const streamUrl = await resolveWithRealDebrid(
            activeUri,
            rdKey,
            (msg) => { if (!isDestroyed()) setConnectMsg(msg) },
            rdAbort.signal,
          )
          if (isDestroyed()) return

          // Sucesso — toca direto via URL HTTP
          const video = videoRef.current!
          video.src = streamUrl

          const onCanPlay = () => {
            if (!isDestroyed()) { setPhase('playing'); video.play().catch(() => {}) }
          }
          const onVideoError = () => {
            if (!isDestroyed()) {
              const code = video.error?.code ?? 0
              showUriError(`Erro ao reproduzir o stream do Real-Debrid (código ${code}). Tente novamente.`)
            }
          }
          video.addEventListener('canplay', onCanPlay, { once: true })
          video.addEventListener('error',   onVideoError, { once: true })
          return  // ← encerra aqui; não precisa de WebTorrent
        } catch (rdErr) {
          if (isDestroyed()) return
          if (rdAbort.signal.aborted) return  // usuário fechou o player

          // RD falhou — informa e tenta WebRTC como fallback
          const msg = (rdErr as Error).message
          const isTimeout = msg.includes('tempo esgotado')
          setConnectMsg(
            isTimeout
              ? `${msg}\nTentando via WebRTC como alternativa…`
              : `Real-Debrid: ${msg}\nTentando via WebRTC…`
          )
          // Pequena pausa para o usuário ler a mensagem antes do WebRTC começar
          await new Promise(r => setTimeout(r, 2000))
          if (isDestroyed()) return
        } finally {
          rdAbortRef.current = null
        }
      }

      // ── WebTorrent (magnet URI) ─────────────────────────────────────────────
      try {
        const { default: WebTorrent } = await import('webtorrent')
        if (isDestroyed()) return

        // Collect all wss:// trackers (custom + defaults)
        const allTrackers = localTrackerStore.get()
        const wssTrackers = allTrackers.filter(t => t.startsWith('wss://'))

        // Build full magnet appending any tracker not already present
        let fullMagnet = activeUri
        for (const tr of allTrackers) {
          if (!fullMagnet.includes(encodeURIComponent(tr)) && !fullMagnet.includes(tr)) {
            fullMagnet += `&tr=${encodeURIComponent(tr)}`
          }
        }

        // Also collect wss:// trackers already embedded in the magnet
        const magnetWss = extractWssTrackers(fullMagnet)
        const announceList = [...new Set([...wssTrackers, ...magnetWss])]

        if (announceList.length === 0) {
          showUriError(
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
          if (!isDestroyed()) showUriError(String(err))
        })

        // Pass trackers both in magnet URI and explicitly via announce
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const torrent = client.add(fullMagnet, { announce: announceList } as any)

        // Progressive status messages while searching for peers
        statusTimersRef.current = [
          setTimeout(() => { if (!isDestroyed()) setConnectMsg('Conectando aos trackers WSS…') }, 6_000),
          setTimeout(() => { if (!isDestroyed()) setConnectMsg('Aguardando peers WebRTC… (pode demorar em redes móveis)') }, 18_000),
          setTimeout(() => { if (!isDestroyed()) setConnectMsg('Ainda tentando… ativando TURN relay…') }, 38_000),
          setTimeout(() => {
            if (!isDestroyed()) {
              const retryInfo = attempt < MAX_AUTO_RETRIES
                ? ` — reconectando automaticamente em breve (${attempt + 1}/${MAX_AUTO_RETRIES + 1})`
                : ''
              setConnectMsg(`Última chance via TURN relay${retryInfo}…`)
            }
          }, 55_000),
        ]

        // Timeout: se não encontrou peers, tenta novamente ou exibe erro
        peerTimeoutRef.current = setTimeout(() => {
          if (isDestroyed() || torrent.numPeers > 0 || torrent.downloaded > 0) return

          statusTimersRef.current.forEach(clearTimeout)

          if (attempt < MAX_AUTO_RETRIES) {
            // Auto-retry: destrói cliente atual e tenta de novo
            client.destroy()
            clientRef.current = null
            const nextAttempt = attempt + 1
            setConnectMsg(`Reconectando… (tentativa ${nextAttempt + 1} de ${MAX_AUTO_RETRIES + 1})`)
            start(nextAttempt)
          } else {
            const hasMore = uriIndex < allUris.length - 1
            const nextIsHttp = hasMore && !allUris[uriIndex + 1]?.startsWith('magnet:')
            showUriError(
              'Nenhum peer WebRTC encontrado após múltiplas tentativas.\n\n' +
              'Possíveis causas:\n' +
              '• O torrent não tem seeders com suporte a WebRTC (necessário para browser)\n' +
              '• Sua rede bloqueia WebRTC (tente em outra rede ou Wi-Fi)\n' +
              '• Todos os trackers wss:// estão fora do ar\n' +
              (nextIsHttp ? '\n→ Tentando link de stream alternativo…' : '\nDica: use o app desktop para torrents sem suporte WebRTC.')
            )
          }
        }, ATTEMPT_TIMEOUT_MS)

        torrent.on('warning', (warn: unknown) => {
          console.warn('[TorrentPlayer] warning:', warn)
        })

        torrent.on('error', (err: unknown) => {
          if (!isDestroyed()) showUriError(String(err))
        })

        torrent.on('trackerAnnounce', () => {
          if (!isDestroyed()) setConnectMsg('Tracker conectado — procurando peers WebRTC…')
        })

        torrent.on('wire', () => {
          if (!isDestroyed()) setConnectMsg('Peer encontrado! Baixando metadados…')
        })

        torrent.on('ready', async () => {
          if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
          statusTimersRef.current.forEach(clearTimeout)
          if (isDestroyed() || !videoRef.current) return

          const videoExts = /\.(mp4|webm|mkv|avi|mov|m4v|ts|m2ts)$/i
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const files: any[] = [...torrent.files]
          const file = files
            .filter(f => videoExts.test(f.name))
            .sort((a, b) => b.length - a.length)[0]

          if (!file) {
            showUriError('Nenhum arquivo de vídeo encontrado neste torrent.')
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

          const video     = videoRef.current!
          const onPlaying = () => { if (!isDestroyed()) setPhase('playing') }
          const onError   = (msg: string) => { if (!isDestroyed()) { setPhase('error'); setErrorMsg(msg) } }
          const mseType   = getMseType(file.name)

          if (mseType) {
            try {
              await streamViaMSE(file, mseType, video, isDestroyed, onPlaying)
            } catch {
              if (!isDestroyed()) {
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
          showUriError(`Erro ao inicializar WebTorrent: ${String(err)}`)
        }
      }
    }

    start(0)

    return () => {
      destroyedRef.current = true
      rdAbortRef.current?.abort()
      rdAbortRef.current = null
      if (peerTimeoutRef.current) clearTimeout(peerTimeoutRef.current)
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)
      statusTimersRef.current.forEach(clearTimeout)
      clientRef.current?.destroy()
      clientRef.current = null
    }
  }, [uri, retryKey, uriIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    setUriIndex(0)
    setRetryKey(k => k + 1)
  }

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
      onRetry={handleRetry}
    />
  )
}
