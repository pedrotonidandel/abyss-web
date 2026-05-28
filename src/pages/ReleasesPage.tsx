import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react'
import { api } from '../api'
import { useAppStore } from '../store/useAppStore'
import type { AppRelease, ReleaseComment, ReleaseReactionGroup } from '../types'

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '🎉', '😮', '😢']

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
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      {/* Header */}
      <button className="w-full flex items-start justify-between p-4 text-left" onClick={handleExpand}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ background: '#00b4ff20', color: '#00b4ff' }}>
              v{release.version}
            </span>
            <span className="text-[10px]" style={{ color: '#555' }}>{formatDate(release.createdAt)}</span>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: '#e0e0e0' }}>{release.title}</h3>
          <p className="text-xs" style={{ color: '#888' }}>por {release.createdByName}</p>
        </div>
        <span style={{ color: '#555' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Changelog */}
          <div className="p-3 rounded-xl text-sm whitespace-pre-wrap" style={{ background: '#0f0f0f', color: '#ccc', maxHeight: 220, overflowY: 'auto' }}>
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
                    background: reacted ? '#00b4ff20' : '#1a1a1a',
                    border: `1px solid ${reacted ? '#00b4ff' : '#2a2a2a'}`,
                  }}
                >
                  <span>{emoji}</span>
                  {group && group.count > 0 && (
                    <span className="text-xs" style={{ color: reacted ? '#00b4ff' : '#888' }}>{group.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: '#555' }} />
              <span className="text-xs" style={{ color: '#888' }}>{comments.length} comentários</span>
            </div>

            {loadingComments && <p className="text-xs" style={{ color: '#555' }}>Carregando…</p>}

            <div className="flex flex-col gap-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="flex-1 p-2.5 rounded-xl" style={{ background: '#0f0f0f' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#00b4ff' }}>
                        {c.displayName ?? c.username}
                      </span>
                      <span className="text-[10px]" style={{ color: '#444' }}>
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: '#ccc' }}>{c.content}</p>
                  </div>
                  {c.userId === currentUserId && (
                    <button className="mt-1" style={{ color: '#444' }} onClick={() => handleDeleteComment(c.id)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Adicionar comentário…"
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e0e0e0' }}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="p-2 rounded-xl disabled:opacity-40"
                style={{ background: '#00b4ff', color: '#000' }}
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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold" style={{ color: '#e0e0e0' }}>Novidades</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#555' }}>Carregando…</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#555' }}>Nenhuma versão publicada ainda.</p>
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
