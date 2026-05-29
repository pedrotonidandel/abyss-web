import { useState, useEffect, useMemo } from 'react'
import { LogOut, Settings, Users, Shield, Bug, Lightbulb, Send, MoreHorizontal, X, Bell, Package, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api'
import type { PublicUserProfile } from '../types'
import { unlockedTitles, defaultTitle, getTitle } from '../utils/titles'
import { FriendsPage } from './FriendsPage'
import { AdminPage } from './AdminPage'
import { SuggestionsPage } from './SuggestionsPage'
import { SettingsPage } from './SettingsPage'

type SubPage = 'profile' | 'friends' | 'admin' | 'suggestions' | 'bug' | 'settings'

interface ProfilePageProps {
  onLogout: () => void
  viewedUserId: number | null
  onNavigate: (page: string) => void
  initialSubPage?: string
  onSubPageChange?: () => void
}

export function ProfilePage({ onLogout, viewedUserId, onNavigate, initialSubPage, onSubPageChange }: ProfilePageProps) {
  const { user, library, setUser } = useAppStore()
  const [subPage, setSubPage] = useState<SubPage>('profile')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [cover, setCover]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [titlePickerOpen, setTitlePickerOpen] = useState(false)
  const [titleSaving, setTitleSaving] = useState(false)

  const targetId = viewedUserId ?? user?.id ?? null
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id

  const ownStats = useMemo(() => {
    if (!isOwnProfile || !profile?.stats) return null
    return {
      totalLibrary:    library.length,
      totalCompleted:  library.filter(l => l.status === 'completed').length,
      completedMovies: library.filter(l => l.status === 'completed' && l.category === 'movies').length,
      completedSeries: library.filter(l => l.status === 'completed' && l.category === 'series').length,
      completedGames:  library.filter(l => l.status === 'completed' && (l.category as string) === 'games').length,
      completedBooks:  library.filter(l => l.status === 'completed' && l.category === 'books').length,
      completedAnimes: library.filter(l => l.status === 'completed' && (l.category as string) === 'animes').length,
      likedCount:      library.filter(l => l.liked).length,
      totalComments:   profile.stats.comments,
      isAdmin:         !!user?.isAdmin,
    }
  }, [library, profile?.stats, isOwnProfile, user?.isAdmin])

  const unlocked = ownStats ? unlockedTitles(ownStats) : []

  const currentTitle = isOwnProfile
    ? (ownStats ? (getTitle(user?.preferredTitle ?? null) ?? defaultTitle(ownStats)) : null)
    : (profile?.preferredTitle ? (getTitle(profile.preferredTitle) ?? null) : null)

  const handleSetTitle = async (titleId: string) => {
    setTitleSaving(true)
    try {
      const updated = await api.auth.setPreferredTitle(titleId)
      setUser(updated)
      setTitlePickerOpen(false)
    } catch { /* ignore */ } finally {
      setTitleSaving(false)
    }
  }

  useEffect(() => {
    if (initialSubPage && isOwnProfile) {
      setSubPage(initialSubPage as SubPage)
      onSubPageChange?.()
    }
  }, [initialSubPage])

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
      // Use own-account endpoint for self (more reliable), user endpoint for others
      const cv = await (isOwnProfile
        ? api.auth.getCover()
        : api.users.getCover(targetId)
      ).catch(() => null)
      setCover(cv)
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

  if (subPage === 'settings') {
    return <SettingsPage onBack={() => setSubPage('profile')} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
      </div>
    )
  }

  const displayName = profile?.displayName ?? profile?.username ?? user?.username ?? '?'
  const stats = profile?.stats

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        <div style={{ position: 'relative', height: 140, flexShrink: 0 }}>
          {/* Banner — photo or gradient fallback */}
          <div style={{
            height: '100%',
            background: cover ? 'var(--panel)' : 'linear-gradient(135deg, oklch(0.22 0.014 240) 0%, oklch(0.28 0.025 260) 50%, oklch(0.22 0.014 240) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {cover ? (
              <img src={cover} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(circle at 20% 50%, oklch(0.85 0.17 90 / 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0,180,255,0.06) 0%, transparent 50%)',
              }} />
            )}
            {/* Dark scrim so buttons are always readable */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
          </div>

          {/* Header buttons overlaid on banner */}
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {isOwnProfile ? 'Perfil' : ''}
            </span>
            {isOwnProfile && (
              <button onClick={() => setDrawerOpen(true)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MoreHorizontal size={18} style={{ color: 'rgba(255,255,255,0.9)' }} />
              </button>
            )}
          </div>

          {/* Avatar + admin star — centered below banner */}
          <div style={{
            position: 'absolute', bottom: -44, left: '50%', transform: 'translateX(-50%)',
            width: 88, height: 88,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid var(--app-bg)',
              background: 'oklch(0.85 0.17 90 / 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: 'var(--brand-yellow)',
            }}>
              {avatar ? (
                <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            {/* Admin star badge — top-right of avatar */}
            {(profile?.isAdmin || (isOwnProfile && user?.isAdmin)) && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--brand-yellow)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--app-bg)',
              }}>
                <Star size={10} style={{ fill: '#0d111a', color: '#0d111a' }} />
              </div>
            )}
          </div>
        </div>

        {/* Name + username + title badge */}
        <div style={{ paddingTop: 56, paddingBottom: 20, textAlign: 'center', paddingLeft: 16, paddingRight: 16 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--lv-text)', margin: 0, letterSpacing: '-0.3px' }}>
            {displayName}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--lv-muted)', margin: '3px 0 0' }}>
            @{profile?.username ?? user?.username}
          </p>
          {/* Title badge — tappable on own profile */}
          {currentTitle && (
            <button
              onClick={isOwnProfile ? () => setTitlePickerOpen(true) : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 8, padding: '4px 12px', borderRadius: 20,
                fontSize: 12, fontWeight: 600,
                background: currentTitle.color, color: '#fff',
                border: 'none', cursor: isOwnProfile ? 'pointer' : 'default',
              }}
            >
              <span>{currentTitle.emoji}</span> {currentTitle.label}
            </button>
          )}
          {(user as unknown as { bio?: string })?.bio && isOwnProfile && (
            <p style={{ fontSize: 13, color: 'var(--lv-muted)', marginTop: 10, lineHeight: 1.5 }}>{(user as unknown as { bio?: string }).bio}</p>
          )}
        </div>

        {/* Stats grid */}
        {stats && (
          <div style={{ padding: '0 16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Total', value: stats.total, color: 'var(--lv-text)' },
                { label: 'Filmes', value: stats.completedMovies, color: '#e5a00d' },
                { label: 'Séries', value: stats.completedSeries, color: '#00b4ff' },
                { label: 'Animes', value: stats.completedAnimes, color: '#a855f7' },
                { label: 'Curtidos', value: stats.liked, color: '#ff4466' },
                { label: 'Comentários', value: stats.comments, color: 'var(--lv-muted)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '12px 8px', borderRadius: 12,
                  background: 'var(--panel)', border: '1px solid var(--divider)',
                }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontSize: 10, color: 'var(--lv-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ padding: '0 16px 24px' }}>
          {isOwnProfile && (
            <button
              onClick={() => setSubPage('friends')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: 'var(--panel)', border: '1px solid var(--divider)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'oklch(0.85 0.17 90 / 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} style={{ color: 'var(--brand-yellow)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Amigos</p>
                {profile?.friendCount != null && (
                  <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: '2px 0 0' }}>{profile.friendCount} amigos</p>
                )}
              </div>
              <span style={{ color: 'var(--lv-muted)', fontSize: 18 }}>›</span>
            </button>
          )}
          {!isOwnProfile && profile && <FriendActionButton profile={profile} onDone={loadProfile} />}
        </div>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && isOwnProfile && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
            }}
          />
          {/* Drawer panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
            width: 280, background: 'var(--panel)',
            borderLeft: '1px solid var(--divider)',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          }}>
            {/* Drawer header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--divider)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--lv-text)' }}>Menu</span>
              <button onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lv-muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            {/* Drawer items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              {[
                { icon: Bell,      label: 'Novidades',      action: () => { onNavigate('releases');    setDrawerOpen(false) }, show: true },
                { icon: Package,   label: 'Addons',          action: () => { onNavigate('sources');     setDrawerOpen(false) }, show: true },
                { icon: Settings,  label: 'Configurações',   action: () => { setSubPage('settings');    setDrawerOpen(false) }, show: true },
                { icon: Shield,    label: 'Administração',   action: () => { setSubPage('admin');       setDrawerOpen(false) }, show: !!user?.isAdmin },
                { icon: Bug,       label: 'Reportar bug',    action: () => { setSubPage('bug');         setDrawerOpen(false) }, show: true },
                { icon: Lightbulb, label: 'Sugestões',       action: () => { setSubPage('suggestions'); setDrawerOpen(false) }, show: true },
              ].filter(item => item.show).map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel-2)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <Icon size={18} style={{ color: 'var(--lv-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--lv-text)', fontWeight: 500 }}>{label}</span>
                </button>
              ))}
            </div>
            {/* Logout at bottom */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
              <button
                onClick={() => { setDrawerOpen(false); onLogout() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', textAlign: 'left',
                }}
              >
                <LogOut size={18} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 14, color: '#ef4444', fontWeight: 600 }}>Sair</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Title picker bottom sheet */}
      {titlePickerOpen && isOwnProfile && (
        <>
          <div
            onClick={() => setTitlePickerOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--panel)',
            borderRadius: '20px 20px 0 0',
            borderTop: '1px solid var(--divider)',
            maxHeight: '75vh',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--divider)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--lv-text)', margin: 0 }}>Escolher título</h3>
              <p style={{ fontSize: 12, color: 'var(--lv-muted)', margin: '4px 0 0' }}>Títulos desbloqueados baseados nas suas conquistas</p>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0 20px' }}>
              {unlocked.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSetTitle(t.id)}
                  disabled={titleSaving}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', background: 'transparent', border: 'none',
                    cursor: titleSaving ? 'default' : 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--divider)',
                    opacity: (user?.preferredTitle === t.id) ? 1 : 0.85,
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: t.color, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {t.emoji} {t.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--lv-muted)' }}>{t.description}</span>
                  {user?.preferredTitle === t.id && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--brand-yellow)', fontWeight: 600, flexShrink: 0 }}>
                      ✓ Ativo
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
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
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--divider)' }}>
        <button onClick={onBack} style={{ color: 'var(--lv-muted)' }}>
          <Bug size={18} style={{ color: '#ff8844' }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Reportar bug</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sent ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <span className="text-3xl">✅</span>
            <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>Bug reportado!</p>
            <p className="text-xs text-center" style={{ color: 'var(--lv-muted)' }}>Obrigado por ajudar a melhorar o app.</p>
            <button onClick={onBack} className="text-xs px-4 py-2 rounded-xl mt-2"
              style={{ background: 'oklch(0.85 0.17 90 / 0.12)', color: 'var(--brand-yellow)', border: '1px solid oklch(0.85 0.17 90 / 0.25)' }}>
              Voltar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--lv-muted)' }}>Categoria</label>
              <div className="flex flex-wrap gap-2">
                {BUG_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      background: category === c ? '#ff884420' : 'var(--chip)',
                      border: `1px solid ${category === c ? '#ff8844' : 'var(--divider)'}`,
                      color: category === c ? '#ff8844' : 'var(--lv-muted)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--lv-muted)' }}>Título</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que aconteceu?"
                maxLength={255}
                className="rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--lv-muted)' }}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema com detalhes…"
                rows={5}
                className="rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
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

  // "Remover": neutral chip; "Aceitar": green; "Adicionar": brand-yellow; outgoing: muted
  const getStyle = () => {
    if (profile.isFriend) {
      return { background: 'var(--chip)', color: '#ef4444', border: '1px solid var(--divider)' }
    }
    if (profile.pendingDirection === 'incoming') {
      return { background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }
    }
    if (profile.pendingDirection === 'outgoing') {
      return { background: 'var(--chip)', color: 'var(--lv-muted)', border: '1px solid var(--divider)' }
    }
    return { background: 'var(--brand-yellow)', color: '#0d111a', border: 'none' }
  }

  return (
    <button
      className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-50"
      style={getStyle()}
      onClick={handleAction}
      disabled={loading || profile.pendingDirection === 'outgoing'}
    >
      {loading ? 'Aguarde…' : label}
    </button>
  )
}
