import { useState, useEffect } from 'react'
import { LogOut, Settings, Users, Shield, Bug, Lightbulb, Send } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import type { PublicUserProfile } from '../types'
import { FriendsPage } from './FriendsPage'
import { AdminPage } from './AdminPage'
import { SuggestionsPage } from './SuggestionsPage'

type SubPage = 'profile' | 'friends' | 'admin' | 'suggestions' | 'bug'

interface ProfilePageProps {
  onLogout: () => void
  viewedUserId: number | null
  onNavigate: (page: string) => void
}

export function ProfilePage({ onLogout, viewedUserId, onNavigate }: ProfilePageProps) {
  const { user } = useAppStore()
  const [subPage, setSubPage] = useState<SubPage>('profile')
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const targetId = viewedUserId ?? user?.id ?? null
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id

  useEffect(() => {
    setSubPage('profile')
    loadProfile()
  }, [viewedUserId, user?.id])

  const loadProfile = async () => {
    if (!targetId) return
    setLoading(true)
    try {
      const [p, av] = await Promise.all([
        api.users.getProfile(targetId),
        api.users.getAvatar(targetId),
      ])
      setProfile(p)
      setAvatar(av)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  if (subPage === 'friends' && isOwnProfile) {
    return <FriendsPage onBack={() => setSubPage('profile')} onOpenProfile={(id) => onNavigate(`profile:${id}`)} />
  }

  if (subPage === 'admin' && user?.isAdmin) {
    return <AdminPage onBack={() => setSubPage('profile')} />
  }

  if (subPage === 'suggestions') {
    return <SuggestionsPage onBack={() => setSubPage('profile')} />
  }

  if (subPage === 'bug') {
    return <BugReportForm onBack={() => setSubPage('profile')} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#555' }}>Carregando…</p>
      </div>
    )
  }

  const displayName = profile?.displayName ?? profile?.username ?? user?.username ?? '?'
  const stats = profile?.stats

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>
          {isOwnProfile ? 'Perfil' : displayName}
        </h2>
        {isOwnProfile && (
          <div className="flex gap-2">
            {user?.isAdmin && (
              <button onClick={() => setSubPage('admin')} style={{ color: '#00b4ff' }}>
                <Shield size={20} />
              </button>
            )}
            <button onClick={onLogout} style={{ color: '#555' }}>
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold"
            style={{ background: '#1a1a1a', border: '2px solid #1e1e1e', color: '#00b4ff' }}>
            {avatar ? (
              <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>{displayName}</h3>
            <p className="text-sm" style={{ color: '#555' }}>@{profile?.username ?? user?.username}</p>
            {profile?.preferredTitle && (
              <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full"
                style={{ background: '#00b4ff20', color: '#00b4ff' }}>
                {profile.preferredTitle}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Concluídos', value: stats.completed },
              { label: 'Curtidos', value: stats.liked },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center p-3 rounded-xl"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <span className="text-xl font-bold" style={{ color: '#e0e0e0' }}>{value}</span>
                <span className="text-xs" style={{ color: '#555' }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {isOwnProfile && (
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl text-left"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              onClick={() => setSubPage('friends')}
            >
              <Users size={20} style={{ color: '#00b4ff' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Amigos</p>
                {profile?.friendCount != null && (
                  <p className="text-xs" style={{ color: '#555' }}>{profile.friendCount} amigos</p>
                )}
              </div>
            </button>
          )}

          {/* Bug + Sugestões lado a lado */}
          {isOwnProfile && (
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center gap-2 p-4 rounded-xl text-left"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                onClick={() => setSubPage('bug')}
              >
                <Bug size={18} style={{ color: '#ff8844' }} />
                <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Reportar bug</p>
              </button>
              <button
                className="flex items-center gap-2 p-4 rounded-xl text-left"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                onClick={() => setSubPage('suggestions')}
              >
                <Lightbulb size={18} style={{ color: '#ffcc00' }} />
                <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Sugestões</p>
              </button>
            </div>
          )}

          {isOwnProfile && (
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl text-left"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              onClick={() => {/* settings */}}
            >
              <Settings size={20} style={{ color: '#555' }} />
              <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Configurações</p>
            </button>
          )}

          {!isOwnProfile && profile && (
            <FriendActionButton profile={profile} onDone={loadProfile} />
          )}

          {isOwnProfile && (
            <button
              className="flex items-center gap-3 w-full p-4 rounded-xl text-left"
              style={{ background: '#ff444420', border: '1px solid #ff444430' }}
              onClick={onLogout}
            >
              <LogOut size={20} style={{ color: '#ff4444' }} />
              <p className="text-sm font-medium" style={{ color: '#ff4444' }}>Sair</p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── BugReportForm ─────────────────────────────────────────────────────────────

const BUG_CATEGORIES = ['Interface', 'Performance', 'Conteúdo', 'Login', 'Outro']

function BugReportForm({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Outro')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.bugs.submit({ title: title.trim(), description: description.trim(), category })
      setSent(true)
    } catch {
      setError('Erro ao enviar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <button onClick={onBack} style={{ color: '#555' }}>
          <Bug size={18} style={{ color: '#ff8844' }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: '#e0e0e0' }}>Reportar bug</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sent ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>Bug reportado!</p>
            <p className="text-xs text-center" style={{ color: '#555' }}>Obrigado por ajudar a melhorar o app.</p>
            <button onClick={onBack} className="text-xs px-4 py-2 rounded-xl mt-2"
              style={{ background: '#00b4ff20', color: '#00b4ff', border: '1px solid #00b4ff30' }}>
              Voltar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#888' }}>Categoria</label>
              <div className="flex flex-wrap gap-2">
                {BUG_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      background: category === c ? '#ff884420' : '#1a1a1a',
                      border: `1px solid ${category === c ? '#ff8844' : '#2a2a2a'}`,
                      color: category === c ? '#ff8844' : '#888',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#888' }}>Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que aconteceu?"
                maxLength={255}
                className="rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e0e0e0' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: '#888' }}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema com detalhes…"
                rows={5}
                className="rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e0e0e0' }}
              />
            </div>

            {error && <p className="text-xs" style={{ color: '#ff4444' }}>{error}</p>}

            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: '#ff884420', color: '#ff8844', border: '1px solid #ff884440' }}
            >
              <Send size={15} />
              {submitting ? 'Enviando…' : 'Enviar relatório'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── FriendActionButton ────────────────────────────────────────────────────────

function FriendActionButton({ profile, onDone }: { profile: PublicUserProfile; onDone: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      if (profile.isFriend) {
        await api.friends.remove(profile.id)
      } else if (profile.pendingDirection === 'incoming' && profile.friendshipId) {
        await api.friends.respond(profile.friendshipId, true)
      } else if (!profile.pendingDirection) {
        await api.friends.request(profile.id)
      }
      onDone()
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  if (profile.isSelf) return null

  const label = profile.isFriend
    ? 'Remover amigo'
    : profile.pendingDirection === 'incoming'
    ? 'Aceitar pedido'
    : profile.pendingDirection === 'outgoing'
    ? 'Pedido enviado'
    : 'Adicionar amigo'

  const color = profile.isFriend ? '#ff4444' : '#00b4ff'

  return (
    <button
      className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50"
      style={{ background: color + '20', color, border: `1px solid ${color}40` }}
      onClick={handleAction}
      disabled={loading || profile.pendingDirection === 'outgoing'}
    >
      {loading ? 'Aguarde…' : label}
    </button>
  )
}
