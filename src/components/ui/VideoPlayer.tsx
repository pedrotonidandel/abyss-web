import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Wifi, Users, ArrowDownCircle } from 'lucide-react'

interface TorrentStats {
  progress: number
  downloadSpeed: number
  numPeers: number
  downloaded: number
  total: number
}

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  title: string
  phase: 'connecting' | 'buffering' | 'playing' | 'error'
  stats?: TorrentStats | null
  connectingMsg?: string
  bufferingMsg?: string
  errorMsg?: string | null
  onClose: () => void
}

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtBytes(b: number): string {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

function fmtSpeed(b: number): string {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB/s`
  return `${(b / 1024 ** 2).toFixed(1)} MB/s`
}

export function VideoPlayer({
  videoRef,
  title,
  phase,
  stats,
  connectingMsg = 'Conectando…',
  bufferingMsg = 'Carregando…',
  errorMsg,
  onClose,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  const [controlsVisible, setControlsVisible] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [paused, setPaused] = useState(true)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVideoBuffering, setIsVideoBuffering] = useState(false)
  const [centerFlash, setCenterFlash] = useState<'play' | 'pause' | null>(null)
  const centerFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track time via RAF for smooth seek bar
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current
      if (v) {
        setCurrentTime(v.currentTime)
        setDuration(v.duration || 0)
        setPaused(v.paused)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [videoRef])

  // Video events
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onWaiting = () => setIsVideoBuffering(true)
    const onCanPlay = () => setIsVideoBuffering(false)
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    const onVolumeChange = () => setMuted(v.muted)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('playing', onCanPlay)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('volumechange', onVolumeChange)
    return () => {
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('playing', onCanPlay)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('volumechange', onVolumeChange)
    }
  }, [videoRef])

  // Fullscreen change event
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false)
    }, 3000)
  }, [videoRef])

  const showControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  const handleContainerTap = useCallback((e: React.MouseEvent) => {
    // Don't handle taps on control elements
    if ((e.target as HTMLElement).closest('[data-controls]')) return
    if (phase !== 'playing') return
    if (!controlsVisible) {
      showControls()
      return
    }
    // Tap on video area → play/pause
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setCenterFlash('play')
    } else {
      v.pause()
      setCenterFlash('pause')
    }
    if (centerFlashTimer.current) clearTimeout(centerFlashTimer.current)
    centerFlashTimer.current = setTimeout(() => setCenterFlash(null), 600)
    scheduleHide()
  }, [phase, controlsVisible, showControls, videoRef, scheduleHide])

  const togglePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play(); else v.pause()
    scheduleHide()
  }, [videoRef, scheduleHide])

  const skip = useCallback((seconds: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
    scheduleHide()
  }, [videoRef, scheduleHide])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return
    v.currentTime = (parseFloat(e.target.value) / 1000) * v.duration
    scheduleHide()
  }, [videoRef, scheduleHide])

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    scheduleHide()
  }, [videoRef, scheduleHide])

  const toggleFullscreen = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {})
    } else {
      await document.exitFullscreen().catch(() => {})
    }
    scheduleHide()
  }, [scheduleHide])

  const seekPct = duration > 0 ? (currentTime / duration) * 1000 : 0

  // Buffer ranges for the seek bar
  const bufferedPct = (() => {
    const v = videoRef.current
    if (!v || !duration) return 0
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= currentTime && v.buffered.end(i) >= currentTime) {
        return (v.buffered.end(i) / duration) * 100
      }
    }
    return 0
  })()

  return (
    <div
      ref={containerRef}
      onClick={handleContainerTap}
      onMouseMove={showControls}
      onTouchStart={showControls}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        cursor: controlsVisible ? 'default' : 'none',
        userSelect: 'none',
      }}
    >
      {/* ── Video element ─────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        playsInline
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain',
          display: phase === 'error' ? 'none' : 'block',
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        data-controls
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          // safe-area-inset-top: accounts for notch, status bar, and iPad Stage Manager title bar
          // safe-area-inset-left/right: accounts for iPad landscape notch area
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 16px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 16px)',
          paddingBottom: 20,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex', alignItems: 'flex-end', gap: 12,
          transition: 'opacity 0.3s',
          opacity: (phase !== 'playing' || controlsVisible) ? 1 : 0,
          pointerEvents: (phase !== 'playing' || controlsVisible) ? 'auto' : 'none',
          zIndex: 10,
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={18} color="#fff" />
        </button>
        <span style={{
          fontSize: 14, fontWeight: 600, color: '#fff', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
        }}>
          {title}
        </span>
      </div>

      {/* ── Connecting overlay ────────────────────────────────────────────── */}
      {phase === 'connecting' && (
        <div style={overlayStyle}>
          <Spinner />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 500, textAlign: 'center', margin: 0 }}>
            {connectingMsg}
          </p>
          {stats && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
              {stats.numPeers} peers · {fmtSpeed(stats.downloadSpeed)}
            </p>
          )}
        </div>
      )}

      {/* ── Buffering / downloading overlay ──────────────────────────────── */}
      {phase === 'buffering' && (
        <div style={overlayStyle}>
          <Spinner />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 500, textAlign: 'center', margin: 0 }}>
            {bufferingMsg}
          </p>
          {stats && stats.total > 0 && (
            <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.progress * 100}%`, background: 'var(--brand-yellow)', transition: 'width 0.5s' }} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>
                {fmtBytes(stats.downloaded)} / {fmtBytes(stats.total)} · {(stats.progress * 100).toFixed(1)}%
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                {stats.numPeers} peers · {fmtSpeed(stats.downloadSpeed)}
              </p>
            </div>
          )}
          {stats && !stats.total && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
              {stats.numPeers} peers · {fmtSpeed(stats.downloadSpeed)}
            </p>
          )}
        </div>
      )}

      {/* ── Error overlay ─────────────────────────────────────────────────── */}
      {phase === 'error' && (
        <div style={overlayStyle}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,0.2)', border: '2px solid rgba(239,68,68,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={24} color="#ef4444" />
          </div>
          <p style={{ color: '#ef4444', fontSize: 15, fontWeight: 700, margin: 0, textAlign: 'center' }}>
            Erro ao reproduzir
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 320 }}>
            {errorMsg}
          </p>
        </div>
      )}

      {/* ── Center buffering spinner (while playing but buffering) ──────── */}
      {phase === 'playing' && isVideoBuffering && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Spinner />
        </div>
      )}

      {/* ── Center play/pause flash ───────────────────────────────────────── */}
      {centerFlash && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'flashFade 0.6s ease-out forwards',
          }}>
            {centerFlash === 'play'
              ? <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: 4 }} />
              : <Pause size={32} fill="#fff" color="#fff" />}
          </div>
          <style>{`@keyframes flashFade { 0% { opacity:1; transform:scale(1) } 100% { opacity:0; transform:scale(1.3) } }`}</style>
        </div>
      )}

      {/* ── Torrent stats badge (top-right, while playing) ────────────────── */}
      {phase === 'playing' && stats && stats.numPeers > 0 && controlsVisible && (
        <div
          data-controls
          style={{
            position: 'absolute', top: 56, right: 16,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            borderRadius: 10, padding: '6px 10px',
            display: 'flex', flexDirection: 'column', gap: 3,
            zIndex: 10,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            <ArrowDownCircle size={10} /> {fmtSpeed(stats.downloadSpeed)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            <Users size={10} /> {stats.numPeers} peers
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
            <Wifi size={10} /> {(stats.progress * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      {phase === 'playing' && (
        <div
          data-controls
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
            transition: 'opacity 0.3s',
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? 'auto' : 'none',
            zIndex: 10,
          }}
        >
          {/* Seek bar */}
          <div style={{ padding: '0 16px 4px', position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
            {/* Buffer track */}
            <div style={{
              position: 'absolute', left: 16, right: 16, height: 3,
              background: 'rgba(255,255,255,0.15)', borderRadius: 2,
            }}>
              <div style={{ height: '100%', width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
            </div>
            {/* Range input */}
            <input
              type="range"
              className="vp-seek"
              min={0}
              max={1000}
              value={seekPct}
              onChange={handleSeek}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative' }}
            />
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 4 }}>
            {/* Skip back */}
            <ControlBtn onClick={skip(-10)} title="Voltar 10s">
              <SkipBack size={20} fill="#fff" color="#fff" />
            </ControlBtn>

            {/* Play / Pause */}
            <ControlBtn onClick={togglePlayPause} title={paused ? 'Play' : 'Pause'} large>
              {paused
                ? <Play size={26} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
                : <Pause size={26} fill="#fff" color="#fff" />}
            </ControlBtn>

            {/* Skip forward */}
            <ControlBtn onClick={skip(10)} title="Avançar 10s">
              <SkipForward size={20} fill="#fff" color="#fff" />
            </ControlBtn>

            {/* Time */}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginLeft: 4, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>

            <div style={{ flex: 1 }} />

            {/* Mute */}
            <ControlBtn onClick={toggleMute} title={muted ? 'Desmutar' : 'Mutar'}>
              {muted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
            </ControlBtn>

            {/* Fullscreen */}
            <ControlBtn onClick={toggleFullscreen} title="Tela cheia">
              {isFullscreen ? <Minimize size={20} color="#fff" /> : <Maximize size={20} color="#fff" />}
            </ControlBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function ControlBtn({ onClick, children, title, large }: {
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
  title?: string
  large?: boolean
}) {
  return (
    <button
      data-controls
      onClick={onClick}
      title={title}
      style={{
        width: large ? 52 : 40, height: large ? 52 : 40,
        borderRadius: '50%',
        background: large ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--brand-yellow)',
        animation: 'vpspin 0.85s linear infinite',
      }} />
      <style>{`@keyframes vpspin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: 16,
  background: 'rgba(0,0,0,0.75)',
  zIndex: 5,
  padding: 32,
}
