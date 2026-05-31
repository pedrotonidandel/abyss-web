import { useState, useMemo, useRef } from 'react'
import { Settings, Wifi, Bell, Trophy, Shield, Package, Zap } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import { localTrackerStore, realDebridStore } from '../utils/localStore'
import { verifyRdKey } from '../utils/realDebrid'
import { unlockedTitles, defaultTitle, getTitle, computeStats } from '../utils/titles'
import { SourcesPage } from './SourcesPage'

type Section = 'geral' | 'trackers' | 'premium' | 'notificacoes' | 'titulos' | 'conta' | 'addons'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'geral',         label: 'Geral',                icon: <Settings size={15} /> },
  { id: 'trackers',      label: 'Trackers',             icon: <Wifi size={15} /> },
  { id: 'premium',       label: 'Premium',              icon: <Zap size={15} /> },
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
  const [saved, setSaved]       = useState(false)
  const savedTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleApply = () => {
    const list = text.split('\n').map(s => s.trim()).filter(Boolean)
    localTrackerStore.set(list)
    setTrackers(list)
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
  }

  const wssCount = text.split('\n').filter(s => s.trim().startsWith('wss://')).length
  const totalCount = text.split('\n').filter(s => s.trim()).length

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
            onChange={e => { setText(e.target.value); setSaved(false) }}
            rows={6}
            placeholder={'wss://tracker.btorrent.xyz:443\nudp://tracker.opentrackr.org:1337/announce'}
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
                background: saved ? '#22c55e' : 'var(--brand-yellow)',
                color: '#0d111a', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {saved ? '✓ Salvo' : 'Aplicar'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--lv-muted)' }}>
              {totalCount} tracker(s)
              {wssCount > 0 && <span style={{ color: '#22c55e', marginLeft: 4 }}>· {wssCount} wss:// (ativos no browser)</span>}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'oklch(0.45 0.01 240)', marginTop: 8, lineHeight: 1.5 }}>
            Apenas trackers <strong>wss://</strong> funcionam no browser (WebRTC). Trackers udp:// e http:// são usados somente no app desktop.
          </p>
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

// ─── Section: Premium ────────────────────────────────────────────────────────

function PremiumSection() {
  const [key, setKey]           = useState(() => realDebridStore.getKey() ?? '')
  const [saved, setSaved]       = useState(() => !!realDebridStore.getKey())
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ ok: true; username: string; type: string; expiration: string } | { ok: false; msg: string } | null>(
    () => {
      const k = realDebridStore.getKey()
      return k ? { ok: true, username: '…', type: '…', expiration: '…' } : null
    }
  )

  const handleSave = () => {
    const trimmed = key.trim()
    if (!trimmed) {
      realDebridStore.clearKey()
      setSaved(false)
      setVerifyResult(null)
      return
    }
    realDebridStore.setKey(trimmed)
    setSaved(true)
    setVerifyResult(null)
  }

  const handleVerify = async () => {
    const k = key.trim()
    if (!k) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const info = await verifyRdKey(k)
      setVerifyResult({ ok: true, ...info })
    } catch (e) {
      setVerifyResult({ ok: false, msg: (e as Error).message })
    } finally {
      setVerifying(false)
    }
  }

  const handleClear = () => {
    setKey('')
    realDebridStore.clearKey()
    setSaved(false)
    setVerifyResult(null)
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--lv-text)', margin: '0 0 4px' }}>Serviços Premium</h2>

      {/* Explicação */}
      <div style={{
        marginTop: 16, padding: '14px 16px', borderRadius: 12,
        background: 'oklch(0.85 0.17 90 / 0.06)',
        border: '1px solid oklch(0.85 0.17 90 / 0.20)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-yellow)', margin: '0 0 6px' }}>
          ⚡ Por que Real-Debrid?
        </p>
        <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: 0, lineHeight: 1.6 }}>
          Torrents no browser só funcionam com pares WebRTC — a maioria dos seeders usa clientes comuns (qBittorrent, etc.) que o browser não consegue alcançar.
        </p>
        <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: '8px 0 0', lineHeight: 1.6 }}>
          Com o Real-Debrid, o Abyss envia o magnet para os servidores deles, que baixam via UDP normal e devolvem um link HTTP direto. Funciona com praticamente qualquer torrent, imediatamente.
        </p>
      </div>

      <SubTitle>REAL-DEBRID</SubTitle>

      {/* Link para obter a chave */}
      <p style={{ fontSize: 12, color: 'var(--lv-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        Crie uma conta gratuita em{' '}
        <a
          href="https://real-debrid.com/?id=free"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--brand-yellow)', textDecoration: 'none', fontWeight: 600 }}
        >
          real-debrid.com
        </a>
        {' '}e acesse a chave API em{' '}
        <a
          href="https://real-debrid.com/apitoken"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--brand-yellow)', textDecoration: 'none', fontWeight: 600 }}
        >
          Minha Conta → API Token
        </a>
        .
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--lv-muted)', display: 'block', marginBottom: 6 }}>
            Chave API do Real-Debrid
          </label>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setSaved(false); setVerifyResult(null) }}
            placeholder="Cole sua chave API aqui"
            style={inputStyle}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(229,160,13,0.4)' }}
            onBlur={e  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={!key.trim() && !saved}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
              background: saved && key.trim() === (realDebridStore.getKey() ?? '') ? '#22c55e' : 'var(--brand-yellow)',
              color: '#0d111a', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            {saved && key.trim() === (realDebridStore.getKey() ?? '') ? '✓ Salvo' : 'Salvar'}
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying || !key.trim()}
            style={{
              padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13,
              background: 'var(--chip)', color: 'var(--lv-text)',
              border: '1px solid var(--divider)', cursor: verifying || !key.trim() ? 'default' : 'pointer',
              opacity: verifying || !key.trim() ? 0.6 : 1,
            }}
          >
            {verifying ? 'Verificando…' : 'Verificar'}
          </button>
          {saved && (
            <button
              onClick={handleClear}
              style={{
                padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
              }}
            >
              Remover
            </button>
          )}
        </div>

        {/* Resultado da verificação */}
        {verifyResult && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: verifyResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${verifyResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {verifyResult.ok ? (
              <div>
                <p style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, margin: '0 0 4px' }}>
                  ✓ Conta verificada — @{verifyResult.username}
                </p>
                <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: 0 }}>
                  Tipo: <strong>{verifyResult.type === 'premium' ? 'Premium ⭐' : 'Gratuito'}</strong>
                  {verifyResult.type === 'premium' && (
                    <> · Expira em: <strong>{new Date(verifyResult.expiration).toLocaleDateString('pt-BR')}</strong></>
                  )}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>
                ✗ {verifyResult.msg}
              </p>
            )}
          </div>
        )}

        {saved && !verifyResult && (
          <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>
            ✓ Real-Debrid ativo — o player usará RD automaticamente para magnets.
          </p>
        )}
      </div>

      <SubTitle>COMO FUNCIONA</SubTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['1. Magnet enviado', 'O app envia o link para os servidores do Real-Debrid.'],
          ['2. RD baixa o torrent', 'Real-Debrid conecta com os seeders via UDP (como um cliente normal).'],
          ['3. URL HTTP gerada', 'O conteúdo fica em cache nos servidores deles, pronto para stream.'],
          ['4. Reprodução direta', 'O browser recebe uma URL HTTP e toca o vídeo sem precisar de WebRTC.'],
        ].map(([step, desc]) => (
          <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
              background: 'oklch(0.85 0.17 90 / 0.12)',
              color: 'var(--brand-yellow)',
            }}>
              {step}
            </span>
            <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: 0 }}>{desc}</p>
          </div>
        ))}
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
      case 'premium':       return <PremiumSection />
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
