import { useState, useRef } from 'react'
import { ArrowLeft, User, Lock, Eye, EyeOff, Check, Camera, Wifi, Image } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { localTrackerStore } from '../utils/localStore'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { user, setUser } = useAppStore()

  // ── Profile fields ────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)

  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ── Cover photo ───────────────────────────────────────────────────────────
  const [coverSaving, setCoverSaving] = useState(false)
  const [coverMsg, setCoverMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // ── Password fields ───────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // ── Trackers ──────────────────────────────────────────────────────────────
  const [trackers, setTrackers] = useState<string[]>(() => localTrackerStore.get())
  const [trackerInput, setTrackerInput] = useState('')

  // ── Privacy ───────────────────────────────────────────────────────────────
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate ?? false)
  const [privacySaving, setPrivacySaving] = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setCoverMsg({ text: 'Imagem muito grande (máx 2 MB).', ok: false }); return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setCoverSaving(true); setCoverMsg(null)
      try {
        await api.auth.saveCover(dataUrl)
        setCoverMsg({ text: 'Foto de capa atualizada!', ok: true })
        setTimeout(() => setCoverMsg(null), 3000)
      } catch (err: unknown) {
        setCoverMsg({ text: (err as Error).message ?? 'Erro ao salvar capa.', ok: false })
      } finally {
        setCoverSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setAvatarMsg({ text: 'Imagem muito grande (máx 500 KB).', ok: false })
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setAvatarSaving(true)
      setAvatarMsg(null)
      try {
        await api.auth.saveAvatar(dataUrl)
        setAvatarMsg({ text: 'Avatar atualizado!', ok: true })
        setTimeout(() => setAvatarMsg(null), 3000)
      } catch (err: unknown) {
        setAvatarMsg({ text: (err as Error).message ?? 'Erro ao salvar avatar.', ok: false })
      } finally {
        setAvatarSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const addTracker = () => {
    const val = trackerInput.trim()
    if (!val || trackers.includes(val)) return
    const newList = [...trackers, val]
    setTrackers(newList)
    localTrackerStore.set(newList)
    setTrackerInput('')
  }

  const removeTracker = (t: string) => {
    const newList = trackers.filter(x => x !== t)
    setTrackers(newList)
    localTrackerStore.set(newList)
  }

  const checkUsername = async (val: string) => {
    setUsername(val)
    if (val === user?.username) { setUsernameStatus('idle'); return }
    if (val.length < 3) { setUsernameStatus('idle'); return }
    setUsernameStatus('checking')
    try {
      const { available } = await api.auth.checkUsername(val)
      setUsernameStatus(available ? 'ok' : 'taken')
    } catch {
      setUsernameStatus('idle')
    }
  }

  const saveProfile = async () => {
    if (usernameStatus === 'taken') return
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const updated = await api.auth.updateProfile({
        displayName: displayName.trim() || undefined,
        username: username !== user?.username ? username : undefined,
      })
      setUser(updated)
      setProfileMsg('Perfil atualizado!')
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (e: unknown) {
      setProfileMsg((e as Error).message ?? 'Erro ao salvar.')
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPw || !newPw) return
    setPwSaving(true)
    setPwMsg(null)
    try {
      await api.auth.changePassword({ current: currentPw, next: newPw })
      setPwMsg({ text: 'Senha alterada!', ok: true })
      setCurrentPw(''); setNewPw('')
    } catch (e: unknown) {
      setPwMsg({ text: (e as Error).message ?? 'Senha atual incorreta.', ok: false })
    } finally {
      setPwSaving(false)
    }
  }

  const togglePrivacy = async () => {
    const next = !isPrivate
    setIsPrivate(next)
    setPrivacySaving(true)
    try {
      const updated = await api.auth.setPrivacy(next)
      setUser(updated)
    } catch {
      setIsPrivate(!next)
    } finally {
      setPrivacySaving(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--chip)', border: '1px solid var(--divider)',
    borderRadius: 10, color: 'var(--lv-text)', fontSize: 14,
    outline: 'none',
  } as React.CSSProperties

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: 'var(--lv-muted)',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    marginBottom: 6, display: 'block',
  }

  const sectionStyle = {
    background: 'var(--panel)', border: '1px solid var(--divider)',
    borderRadius: 16, padding: '20px',
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
        <h2 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Configurações</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Camera size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Foto de perfil</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Avatar preview */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'var(--chip)', border: '1px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'var(--brand-yellow)',
              overflow: 'hidden', position: 'relative',
            }}>
              {(user as unknown as { avatarUrl?: string })?.avatarUrl ? (
                <img src={(user as unknown as { avatarUrl?: string }).avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{(user?.displayName ?? user?.username ?? '?')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: 0 }}>
                JPEG, PNG ou WebP · máx 500 KB
              </p>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarSaving}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: avatarSaving ? 'var(--chip)' : 'var(--brand-yellow)',
                  color: avatarSaving ? 'var(--lv-muted)' : '#0d111a',
                  border: 'none', cursor: avatarSaving ? 'default' : 'pointer',
                  width: 'fit-content',
                }}
              >
                {avatarSaving ? 'Salvando…' : 'Escolher foto'}
              </button>
              {avatarMsg && (
                <p style={{ fontSize: 12, color: avatarMsg.ok ? '#22c55e' : '#ef4444', margin: 0 }}>
                  {avatarMsg.text}
                </p>
              )}
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarFile}
          />
        </div>

        {/* ── Foto de capa ─────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Image size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Foto de capa</span>
          </div>

          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={coverSaving}
            style={{
              width: '100%', padding: '32px 0',
              background: 'var(--chip)', border: '2px dashed var(--divider)',
              borderRadius: 12, cursor: coverSaving ? 'default' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              color: 'var(--lv-muted)',
            }}
          >
            <Image size={24} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13 }}>
              {coverSaving ? 'Salvando…' : 'Selecionar foto de capa (máx 2 MB)'}
            </span>
          </button>

          {coverMsg && (
            <p style={{ fontSize: 12, marginTop: 8, color: coverMsg.ok ? '#22c55e' : '#ef4444' }}>
              {coverMsg.text}
            </p>
          )}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleCoverFile}
          />
        </div>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center gap-2 mb-4">
            <User size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Perfil</span>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>Nome de exibição</label>
              <input
                style={inputStyle}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={user?.username ?? 'Seu nome'}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Usuário</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 36 }}
                  value={username}
                  onChange={e => checkUsername(e.target.value)}
                  placeholder="@usuario"
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                />
                {usernameStatus === 'ok' && (
                  <Check size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#22c55e' }} />
                )}
              </div>
              {usernameStatus === 'taken' && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Usuário já em uso.</p>
              )}
              {usernameStatus === 'checking' && (
                <p style={{ fontSize: 12, color: 'var(--lv-muted)', marginTop: 4 }}>Verificando…</p>
              )}
            </div>

            {profileMsg && (
              <p style={{ fontSize: 13, color: profileMsg.includes('!') ? '#22c55e' : '#ef4444' }}>
                {profileMsg}
              </p>
            )}

            <button
              onClick={saveProfile}
              disabled={profileSaving || usernameStatus === 'taken' || usernameStatus === 'checking'}
              style={{
                width: '100%', padding: '11px 0',
                background: profileSaving ? 'oklch(0.85 0.17 90 / 0.5)' : 'var(--brand-yellow)',
                color: '#0d111a', borderRadius: 10, fontWeight: 700, fontSize: 14,
                border: 'none', cursor: profileSaving ? 'default' : 'pointer',
              }}
            >
              {profileSaving ? 'Salvando…' : 'Salvar perfil'}
            </button>
          </div>
        </div>

        {/* ── Privacidade ──────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Perfil privado</span>
              <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>
                Somente amigos veem sua biblioteca
              </span>
            </div>
            {/* Toggle */}
            <button
              onClick={togglePrivacy}
              disabled={privacySaving}
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: isPrivate ? 'var(--brand-yellow)' : 'var(--chip)',
                border: '1px solid var(--divider)',
                position: 'relative', cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: isPrivate ? 22 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: isPrivate ? '#0d111a' : 'var(--lv-muted)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {/* ── Trackers ─────────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Wifi size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Trackers personalizados</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--lv-muted)', marginBottom: 14 }}>
            Adicionados a torrents iniciados pelo app
          </p>
          <div className="flex gap-2 mb-3">
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={trackerInput}
              onChange={e => setTrackerInput(e.target.value)}
              placeholder="wss://tracker.openwebtorrent.com"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTracker() } }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
              onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
            />
            <button
              onClick={addTracker}
              style={{
                padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'var(--brand-yellow)', color: '#0d111a',
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Adicionar
            </button>
          </div>
          {trackers.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--lv-muted)', textAlign: 'center', padding: '8px 0' }}>
              Nenhum tracker adicionado.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {trackers.map(t => (
                <div key={t} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--chip)', border: '1px solid var(--divider)' }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--lv-text)', wordBreak: 'break-all' }}>{t}</span>
                  <button
                    onClick={() => removeTracker(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444', padding: '2px 4px', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Senha ────────────────────────────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Lock size={16} style={{ color: 'var(--brand-yellow)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--lv-text)' }}>Alterar senha</span>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label style={labelStyle}>Senha atual</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lv-muted)' }}>
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  style={{ ...inputStyle, paddingRight: 40 }}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                  onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lv-muted)' }}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {pwMsg && (
              <p style={{ fontSize: 13, color: pwMsg.ok ? '#22c55e' : '#ef4444' }}>{pwMsg.text}</p>
            )}

            <button
              onClick={savePassword}
              disabled={pwSaving || !currentPw || !newPw}
              style={{
                width: '100%', padding: '11px 0',
                background: (pwSaving || !currentPw || !newPw) ? 'var(--chip)' : 'var(--brand-yellow)',
                color: (pwSaving || !currentPw || !newPw) ? 'var(--lv-muted)' : '#0d111a',
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                border: '1px solid var(--divider)', cursor: (pwSaving || !currentPw || !newPw) ? 'default' : 'pointer',
              }}
            >
              {pwSaving ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </div>

        {/* Info */}
        <p style={{ fontSize: 11, color: 'var(--lv-muted)', textAlign: 'center', opacity: 0.5, paddingBottom: 16 }}>
          Abyss Web PWA · {user?.email}
        </p>
      </div>
    </div>
  )
}
