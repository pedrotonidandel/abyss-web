import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react'
import { api } from '../api'
import { useAppStore } from '../store/useAppStore'
import type { AppRelease, ReleaseComment, ReleaseReactionGroup } from '../types'

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '🎉', '😮', '😢']

function UserAvatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'oklch(0.85 0.17 90 / 0.15)', border: '1px solid var(--divider)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'var(--brand-yellow)',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function openProfile(userId: number) {
  const w = window as unknown as { openUserProfile?: (id: number) => void }
  if (w.openUserProfile) w.openUserProfile(userId)
}

interface ReleaseItemProps {
  release: AppRelease
  currentUserId: number
}

function ReleaseItem({ release, currentUserId }: ReleaseItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<ReleaseComment[]>([])
  const [reactions, setReactions] = useState<ReleaseReactionGroup[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadDetails = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    try {
      const [c, r] = await Promise.all([
        api.releases.listComments(release.id),
        api.releases.listReactions(release.id),
      ])
      setComments(c)
      setReactions(r)
    } catch { /* ignore */ } finally {
      setLoadingComments(false)
    }
  }

  const handleExpand = () => {
    if (!expanded) loadDetails()
    setExpanded((v) => !v)
  }

  const handleReaction = async (emoji: string) => {
    try {
      await api.releases.toggleReaction(release.id, emoji)
      await loadDetails()
    } catch { /* ignore */ }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      const c = await api.releases.addComment(release.id, newComment.trim())
      setComments((prev) => [...prev, c])
      setNewComment('')
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.releases.deleteComment(release.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch { /* ignore */ }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
      {/* Header */}
      <button className="w-full flex items-start justify-between p-4 text-left" onClick={handleExpand}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ background: 'oklch(0.85 0.17 90 / 0.10)', color: 'var(--brand-yellow)' }}>
              v{release.version}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(release.createdAt)}</span>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--lv-text)' }}>{release.title}</h3>
          <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>por {release.createdByName}</p>
        </div>
        <span style={{ color: 'var(--lv-muted)' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Changelog — tamanho estático, sem scroll */}
          <div className="p-3 rounded-xl text-sm whitespace-pre-wrap" style={{ background: 'var(--panel-2)', color: 'var(--lv-text)' }}>
            {release.changelog}
          </div>

          {/* Reactions */}
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map((emoji) => {
              const group = reactions.find((r) => r.emoji === emoji)
              const reacted = group?.userIds.includes(currentUserId)
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm"
                  style={{
                    background: reacted ? 'oklch(0.85 0.17 90 / 0.12)' : 'var(--chip)',
                    border: `1px solid ${reacted ? 'var(--brand-yellow)' : 'var(--divider)'}`,
                  }}
                >
                  <span>{emoji}</span>
                  {group && group.count > 0 && (
                    <span className="text-xs" style={{ color: reacted ? 'var(--brand-yellow)' : 'var(--lv-muted)' }}>{group.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'var(--lv-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>{comments.length} comentários</span>
            </div>

            {loadingComments && <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>}

            {/* Lista com scroll */}
            <div className="flex flex-col gap-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {comments.map((c) => {
                const name = c.displayName ?? c.username
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    <button onClick={() => openProfile(c.userId)} className="shrink-0 mt-0.5">
                      <UserAvatar name={name} avatarUrl={c.avatarUrl} size={26} />
                    </button>
                    <div className="flex-1 p-2.5 rounded-xl" style={{ background: 'var(--panel-2)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--brand-yellow)' }}
                          onClick={() => openProfile(c.userId)}
                        >
                          {name}
                        </button>
                        <span className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--lv-text)' }}>{c.content}</p>
                    </div>
                    {c.userId === currentUserId && (
                      <button className="mt-1 text-xs" style={{ color: 'var(--lv-muted)' }} onClick={() => handleDeleteComment(c.id)}>
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário…"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export function ReleasesPage() {
  const [releases, setReleases] = useState<AppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  useEffect(() => {
    api.releases.list()
      .then(setReleases)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold" style={{ color: 'var(--lv-text)' }}>Novidades</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Nenhuma versão publicada ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-3">
            {releases.map((r) => (
              <ReleaseItem key={r.id} release={r} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
