import { useState, useMemo } from 'react'
import { Settings, Wifi, Bell, Trophy, Shield, Package } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { localTrackerStore } from '../utils/localStore'
import { unlockedTitles, defaultTitle, getTitle, computeStats } from '../utils/titles'
import { SourcesPage } from './SourcesPage'

type Section = 'geral' | 'trackers' | 'notificacoes' | 'titulos' | 'conta' | 'addons'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'geral',         label: 'Geral',                icon: <Settings size={15} /> },
  { id: 'trackers',      label: 'Trackers',             icon: <Wifi size={15} /> },
  { id: 'notificacoes',  label: 'Notificações',         icon: <Bell size={15} /> },
  { id: 'titulos',       label: 'Títulos',              icon: <Trophy size={15} /> },
  { id: 'conta',         label: 'Conta & Privacidade',  icon: <Shield size={15} /> },
  { id: 'addons',        label: 'Addons',               icon: <Package size={15} /> },
]

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 11, fontWeight: 700, color: 'var(--brand-yellow)',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      margin: '24px 0 12px',
    }}>
      {children}
    </h3>
  )
}

function ToggleRow({
  label, desc, checked, onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '12px 0', borderBottom: '1px solid var(--divider)',
    }}>
      <div>
        <p style={{ fontSize: 14, color: 'var(--lv-text)', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: '3px 0 0' }}>{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer',
          background: checked ? 'var(--brand-yellow)' : 'var(--chip)',
          border: 'none', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 20 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#0d111a' : 'var(--lv-muted)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--chip)', border: '1px solid var(--divider)',
  borderRadius: 10, color: 'var(--lv-text)', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}

// ─── Section: Geral ──────────────────────────────────────────────────────────

function GeralSection() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Geral</h2>
      <SubTitle>NOÇÕES BÁSICAS</SubTitle>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
        <p style={{ fontSize: 14, color: 'var(--lv-text)', margin: 0 }}>Versão do app</p>
        <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: 0 }}>Abyss Web PWA</p>
      </div>
      <SubTitle>PREFERÊNCIAS</SubTitle>
      <p style={{ fontSize: 13, color: 'var(--lv-muted)' }}>Mais preferências serão adicionadas em breve.</p>
    </div>
  )
}

// ─── Section: Trackers ───────────────────────────────────────────────────────

function TrackersSection() {
  const [trackers, setTrackers] = useState<string[]>(() => localTrackerStore.get())
  const [inject, setInject]     = useState(() => trackers.length > 0)
  const [text, setText]         = useState(() => trackers.join('\n'))

  const handleApply = () => {
    const list = text.split('\n').map(s => s.trim()).filter(Boolean)
    localTrackerStore.set(list)
    setTrackers(list)
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Trackers Personalizados</h2>
      <SubTitle>TRACKERS BITTORRENT</SubTitle>
      <ToggleRow
        label="Injetar trackers adicionais"
        desc="Adiciona seus próprios trackers a todos os streams via torrent"
        checked={inject}
        onChange={setInject}
      />
      {inject && (
        <div style={{ marginTop: 16 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            placeholder={'udp://tracker.example.com:6969/announce\nudp://tracker2.example.com:1337/announce'}
            style={{
              ...inputStyle,
              resize: 'vertical', lineHeight: 1.6,
              fontFamily: 'monospace', fontSize: 12,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <button
              onClick={handleApply}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'var(--brand-yellow)', color: '#0d111a',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Aplicar
            </button>
            <span style={{ fontSize: 12, color: 'var(--lv-muted)' }}>
              {text.split('\n').filter(s => s.trim()).length} tracker(s) configurado(s)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section: Notificações ───────────────────────────────────────────────────

function NotificacoesSection() {
  const [perm, setPerm] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )

  const handleRequest = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPerm(result)
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Notificações</h2>
      <SubTitle>PUSH NOTIFICATIONS</SubTitle>
      <ToggleRow
        label="Notificações do browser"
        desc="Receba notificações mesmo com o app fechado"
        checked={perm === 'granted'}
        onChange={() => handleRequest()}
      />
      {perm !== 'granted' && (
        <button
          onClick={handleRequest}
          style={{
            marginTop: 16, padding: '10px 20px', borderRadius: 10,
            border: '1px solid var(--divider)', background: 'var(--chip)',
            color: 'var(--lv-text)', fontSize: 14, cursor: 'pointer',
          }}
        >
          Ativar notificações
        </button>
      )}
      {perm === 'denied' && (
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>
          Permissão negada. Ative manualmente nas configurações do navegador.
        </p>
      )}
    </div>
  )
}

// ─── Section: Títulos ────────────────────────────────────────────────────────

function TitulosSection() {
  const { user, library, setUser } = useAppStore()
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => {
    if (!user) return null
    return computeStats(library, 0, !!user.isAdmin)
  }, [library, user])

  const unlocked = stats ? unlockedTitles(stats) : []
  const currentTitle = user
    ? (stats ? (getTitle(user.preferredTitle ?? null) ?? defaultTitle(stats)) : null)
    : null

  const handleSet = async (titleId: string) => {
    setSaving(true)
    try {
      const updated = await api.auth.setPreferredTitle(titleId)
      setUser(updated)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Títulos</h2>
      <SubTitle>SEUS TÍTULOS DESBLOQUEADOS</SubTitle>
      {unlocked.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--lv-muted)' }}>Complete conquistas para desbloquear títulos.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {unlocked.map(title => {
            const isSelected = currentTitle?.id === title.id
            return (
              <button
                key={title.id}
                onClick={() => !saving && handleSet(title.id)}
                title={title.description}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8, cursor: saving ? 'default' : 'pointer',
                  border: isSelected ? '1.5px solid var(--brand-yellow)' : '1px solid var(--divider)',
                  background: title.color,
                  color: '#ffffff', fontSize: 13, fontWeight: 500,
                  opacity: saving ? 0.7 : 1,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 11 }}>{title.emoji}</span>
                {title.label}
                {isSelected && (
                  <span style={{
                    fontSize: 9, background: 'var(--brand-yellow)', color: '#0d111a',
                    borderRadius: 4, padding: '1px 5px', fontWeight: 700, marginLeft: 2,
                  }}>
                    ATIVO
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Section: Conta & Privacidade ────────────────────────────────────────────

function ContaSection() {
  const { user, setUser } = useAppStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [username, setUsername]       = useState(user?.username ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg]   = useState<string | null>(null)

  const [isPrivate, setIsPrivate]     = useState(user?.isPrivate ?? false)

  const [curPw, setCurPw]             = useState('')
  const [newPw, setNewPw]             = useState('')
  const [pwMsg, setPwMsg]             = useState<string | null>(null)
  const [pwSaving, setPwSaving]       = useState(false)

  const handleProfileSave = async () => {
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const updated = await api.auth.updateProfile({ displayName: displayName || undefined, username: username || undefined })
      setUser(updated)
      setProfileMsg('Perfil atualizado!')
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (e) {
      setProfileMsg(`Erro: ${(e as Error).message}`)
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePrivacyToggle = async (v: boolean) => {
    setIsPrivate(v)
    try {
      const updated = await api.auth.setPrivacy(v)
      setUser(updated)
    } catch { setIsPrivate(!v) }
  }

  const handlePasswordChange = async () => {
    if (!curPw || !newPw) return
    setPwSaving(true)
    setPwMsg(null)
    try {
      await api.auth.changePassword({ current: curPw, next: newPw })
      setPwMsg('Senha alterada com sucesso!')
      setCurPw(''); setNewPw('')
      setTimeout(() => setPwMsg(null), 3000)
    } catch (e) {
      setPwMsg(`Erro: ${(e as Error).message}`)
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Conta & Privacidade</h2>

      <SubTitle>PERFIL</SubTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--lv-muted)', display: 'block', marginBottom: 6 }}>Nome de exibição</label>
          <input
            style={inputStyle}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Seu nome"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--lv-muted)', display: 'block', marginBottom: 6 }}>Username</label>
          <input
            style={inputStyle}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="@username"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
          />
        </div>
        <button
          onClick={handleProfileSave}
          disabled={profileSaving}
          style={{
            alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8, border: 'none',
            background: profileSaving ? 'var(--chip)' : 'var(--brand-yellow)',
            color: profileSaving ? 'var(--lv-muted)' : '#0d111a',
            fontWeight: 700, fontSize: 13, cursor: profileSaving ? 'default' : 'pointer',
          }}
        >
          {profileSaving ? 'Salvando…' : 'Salvar'}
        </button>
        {profileMsg && (
          <p style={{ fontSize: 12, color: profileMsg.startsWith('Erro') ? '#ef4444' : '#22c55e', margin: 0 }}>{profileMsg}</p>
        )}
      </div>

      <SubTitle>PRIVACIDADE</SubTitle>
      <ToggleRow
        label="Perfil privado"
        desc="Somente amigos podem ver sua biblioteca e atividade"
        checked={isPrivate}
        onChange={handlePrivacyToggle}
      />

      <SubTitle>SEGURANÇA</SubTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--lv-muted)', display: 'block', marginBottom: 6 }}>Senha atual</label>
          <input
            type="password"
            style={inputStyle}
            value={curPw}
            onChange={e => setCurPw(e.target.value)}
            placeholder="Senha atual"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--lv-muted)', display: 'block', marginBottom: 6 }}>Nova senha</label>
          <input
            type="password"
            style={inputStyle}
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Nova senha"
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
          />
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={pwSaving || !curPw || !newPw}
          style={{
            alignSelf: 'flex-start', padding: '9px 20px', borderRadius: 8, border: 'none',
            background: (pwSaving || !curPw || !newPw) ? 'var(--chip)' : 'var(--brand-yellow)',
            color: (pwSaving || !curPw || !newPw) ? 'var(--lv-muted)' : '#0d111a',
            fontWeight: 700, fontSize: 13, cursor: (pwSaving || !curPw || !newPw) ? 'default' : 'pointer',
          }}
        >
          {pwSaving ? 'Alterando…' : 'Alterar senha'}
        </button>
        {pwMsg && (
          <p style={{ fontSize: 12, color: pwMsg.startsWith('Erro') ? '#ef4444' : '#22c55e', margin: 0 }}>{pwMsg}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsWebPage() {
  const [section, setSection] = useState<Section>('geral')

  const renderContent = () => {
    switch (section) {
      case 'geral':         return <GeralSection />
      case 'trackers':      return <TrackersSection />
      case 'notificacoes':  return <NotificacoesSection />
      case 'titulos':       return <TitulosSection />
      case 'conta':         return <ContaSection />
      case 'addons':
        return (
          <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
            <SourcesPage onBack={() => {}} />
          </div>
        )
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--app-bg)' }}>
      {/* ── Left nav ──────────────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, background: 'var(--panel)',
        borderRight: '1px solid var(--divider)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--lv-text)', margin: 0 }}>Ajustes</h2>
        </div>
        <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: section === s.id ? 'oklch(0.85 0.17 90 / 0.10)' : 'transparent',
                color: section === s.id ? 'var(--brand-yellow)' : 'var(--lv-muted)',
                fontWeight: section === s.id ? 600 : 400,
                fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'left',
              }}
              onMouseEnter={e => { if (section !== s.id) (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.04)' }}
              onMouseLeave={e => { if (section !== s.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ color: section === s.id ? 'var(--brand-yellow)' : 'var(--lv-muted)', display: 'flex' }}>
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Right content ─────────────────────────────────────────────────── */}
      {section === 'addons' ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SourcesPage onBack={() => {}} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {renderContent()}
        </div>
      )}
    </div>
  )
}
