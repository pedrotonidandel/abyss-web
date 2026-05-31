/**
 * Real-Debrid API client.
 *
 * Real-Debrid baixa torrents (via UDP/HTTP normais) nos servidores deles e
 * retorna uma URL HTTP direta que o browser consegue reproduzir sem WebRTC.
 *
 * API Base: https://api.real-debrid.com/rest/1.0
 * Docs:     https://api.real-debrid.com/
 * CORS:     suportado — pode ser chamado direto do browser.
 */

const RD_BASE = 'https://api.real-debrid.com/rest/1.0'

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function rdFetch<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  apiKey: string,
  body?: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${RD_BASE}${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  })

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const json = await res.json() as { error?: string; error_code?: number }
      if (json.error) msg = json.error
    } catch { /* ignore */ }
    throw new Error(`Real-Debrid: ${msg}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as T
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RDUser {
  username: string
  email: string
  expiration: string  // ISO date — premium expires at
  type: 'premium' | 'free'
}

type RDTorrentStatus =
  | 'magnet_error' | 'magnet_conversion' | 'waiting_files_selection'
  | 'queued' | 'downloading' | 'downloaded'
  | 'error' | 'virus' | 'compressing' | 'uploading' | 'dead'

interface RDTorrentAdd {
  id: string
  uri: string
}

interface RDTorrentInfo {
  id: string
  status: RDTorrentStatus
  progress: number   // 0-100
  seeders: number
  speed: number      // bytes/s
  links: string[]    // "host links" — need to be unrestricted
  files?: { id: number; path: string; bytes: number; selected: number }[]
}

interface RDUnrestrict {
  download: string   // Direct HTTP URL — set as video.src
  filename: string
  filesize: number
  mimeType: string
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Verifica se a chave é válida e retorna dados da conta. */
export async function verifyRdKey(apiKey: string): Promise<{ username: string; type: string; expiration: string }> {
  const user = await rdFetch<RDUser>('GET', '/user', apiKey)
  return { username: user.username, type: user.type, expiration: user.expiration }
}

const STATUS_LABELS: Partial<Record<RDTorrentStatus, string>> = {
  magnet_conversion:      'convertendo magnet…',
  waiting_files_selection: 'selecionando arquivos…',
  queued:                 'na fila do servidor…',
  downloading:            '',  // formatado com %
  compressing:            'comprimindo…',
  uploading:              'enviando para cache…',
}

/**
 * Envia o magnet para RD e aguarda até ter uma URL de stream pronta.
 *
 * Para torrents já em cache (~80% dos populares) demora 5-15s.
 * Para torrents novos, pode demorar minutos — nesse caso onStatus avisa.
 *
 * @throws se o torrent tiver erro, for vírus, ou o timeout (90s) expirar.
 */
export async function resolveWithRealDebrid(
  magnet: string,
  apiKey: string,
  onStatus: (msg: string) => void,
  signal: AbortSignal,
): Promise<string> {
  // 1. Adiciona o magnet ao RD
  onStatus('Real-Debrid: adicionando torrent…')
  const { id } = await rdFetch<RDTorrentAdd>('POST', '/torrents/addMagnet', apiKey, { magnet }, signal)

  // Cleanup: remove o torrent do RD se o player for fechado antes de terminar
  signal.addEventListener('abort', () => {
    rdFetch('DELETE', `/torrents/delete/${id}`, apiKey).catch(() => {})
  }, { once: true })

  // 2. Seleciona todos os arquivos (necessário antes de iniciar o download)
  await rdFetch('POST', `/torrents/selectFiles/${id}`, apiKey, { files: 'all' }, signal)

  // 3. Aguarda o status "downloaded" (máx 90s — suficiente para torrents em cache)
  onStatus('Real-Debrid: processando…')
  const deadline = Date.now() + 90_000
  let lastInfo: RDTorrentInfo | null = null

  while (Date.now() < deadline) {
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError')

    // Intervalo: 3s nos primeiros 20s (cache rápido), 5s depois
    const elapsed = deadline - Date.now()
    await new Promise<void>(r => setTimeout(r, elapsed > 70_000 ? 3_000 : 5_000))
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError')

    lastInfo = await rdFetch<RDTorrentInfo>('GET', `/torrents/info/${id}`, apiKey, undefined, signal)

    if (lastInfo.status === 'downloaded') break

    const fatal: RDTorrentStatus[] = ['error', 'virus', 'dead', 'magnet_error']
    if (fatal.includes(lastInfo.status)) {
      throw new Error(`Real-Debrid: ${lastInfo.status === 'virus' ? 'arquivo detectado como vírus' : `erro no torrent (${lastInfo.status})`}`)
    }

    // Atualiza mensagem de status
    if (lastInfo.status === 'downloading') {
      const pct = lastInfo.progress?.toFixed(0) ?? '0'
      const spd = lastInfo.speed > 0 ? ` · ${(lastInfo.speed / 1024 / 1024).toFixed(1)} MB/s` : ''
      onStatus(`Real-Debrid: baixando ${pct}%${spd}…`)
    } else {
      const label = STATUS_LABELS[lastInfo.status] ?? `${lastInfo.status}…`
      onStatus(`Real-Debrid: ${label}`)
    }
  }

  if (lastInfo?.status !== 'downloaded') {
    throw new Error(
      'Real-Debrid: tempo esgotado.\n' +
      'O torrent pode não estar em cache ainda — tente novamente em alguns minutos.'
    )
  }

  if (!lastInfo.links?.length) {
    throw new Error('Real-Debrid: sem links disponíveis para este torrent.')
  }

  // 4. Desrestringe o link para obter URL direta de stream
  // Para torrents multi-arquivo, escolhe o arquivo de vídeo maior.
  // Para filmes simples, links[0] é o único arquivo.
  onStatus('Real-Debrid: obtendo link de stream…')

  // Tenta o primeiro link; se falhar (ex: arquivo de legenda), tenta o próximo
  let downloadUrl: string | null = null
  for (const link of lastInfo.links.slice(0, 3)) {
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError')
    try {
      const unrestricted = await rdFetch<RDUnrestrict>('POST', '/unrestrict/link', apiKey, { link }, signal)
      const isVideo = /\.(mp4|mkv|avi|mov|webm|m4v|ts|m2ts)$/i.test(unrestricted.filename)
        || unrestricted.mimeType?.startsWith('video/')
      if (isVideo || !downloadUrl) {
        downloadUrl = unrestricted.download
        if (isVideo) break  // vídeo encontrado — usa este
      }
    } catch { /* tenta próximo link */ }
  }

  if (!downloadUrl) throw new Error('Real-Debrid: não foi possível obter URL de stream.')

  return downloadUrl
}
