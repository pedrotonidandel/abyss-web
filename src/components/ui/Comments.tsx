import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Reply, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../../api'

interface Comment {
  id: number
  userId: number
  username: string
  displayName: string
  parentId: number | null
  rating: number | null
  content: string
  createdAt: string
  likes: number
  dislikes: number
  userVote: 'like' | 'dislike' | null
}

interface CommentsProps {
  contentKey: string
  currentUserId: number
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          style={{ color: n <= value ? '#f59e0b' : 'var(--lv-muted)' }}
        >
          <Star size={16} fill={n <= value ? '#f59e0b' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export function Comments({ contentKey, currentUserId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    load()
  }, [contentKey])

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.comments.list(contentKey)
      setComments(data as Comment[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim()) return
    setSubmitting(true)
    try {
      const c = await api.comments.create({
        contentKey,
        parentId: null,
        rating: newRating > 0 ? newRating : null,
        content: newContent.trim(),
      })
      setComments((prev) => [c as Comment, ...prev])
      setNewContent('')
      setNewRating(0)
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !replyTo) return
    setSubmitting(true)
    try {
      const c = await api.comments.create({
        contentKey,
        parentId: replyTo.id,
        rating: null,
        content: replyContent.trim(),
      })
      setComments((prev) => [...prev, c as Comment])
      setReplyContent('')
      setReplyTo(null)
      setExpanded((prev) => new Set([...prev, replyTo.id]))
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (commentId: number, vote: 'like' | 'dislike') => {
    const c = comments.find((x) => x.id === commentId)
    if (!c) return
    const newVote = c.userVote === vote ? null : vote
    try {
      await api.comments.vote(commentId, newVote)
      setComments((prev) => prev.map((x) => {
        if (x.id !== commentId) return x
        const wasLike = x.userVote === 'like'
        const wasDislike = x.userVote === 'dislike'
        return {
          ...x,
          userVote: newVote,
          likes: newVote === 'like' ? x.likes + 1 : wasLike ? x.likes - 1 : x.likes,
          dislikes: newVote === 'dislike' ? x.dislikes + 1 : wasDislike ? x.dislikes - 1 : x.dislikes,
        }
      }))
    } catch { /* ignore */ }
  }

  const handleDelete = async (commentId: number) => {
    try {
      await api.comments.remove(commentId)
      setComments((prev) => prev.filter((x) => x.id !== commentId))
    } catch { /* ignore */ }
  }

  const topLevel = comments.filter((c) => c.parentId === null)
  const replies = (parentId: number) => comments.filter((c) => c.parentId === parentId)

  const openProfile = (userId: number) => {
    const w = window as unknown as { openUserProfile?: (id: number) => void }
    if (w.openUserProfile) w.openUserProfile(userId)
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--lv-text)' }}>Comentários ({topLevel.length})</h3>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
        <StarRating value={newRating} onChange={setNewRating} />
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Escreva um comentário…"
          rows={3}
          className="w-full resize-none rounded-lg p-2 text-sm outline-none"
          style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
        />
        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          className="self-end px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
        >
          Publicar
        </button>
      </form>

      {/* Reply form */}
      {replyTo && (
        <form onSubmit={handleReply} className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>Respondendo a @{replyTo.username}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-xs" style={{ color: 'var(--lv-muted)' }}>Cancelar</button>
          </div>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Sua resposta…"
            rows={2}
            className="w-full resize-none rounded-lg p-2 text-sm outline-none"
            style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
          />
          <button
            type="submit"
            disabled={submitting || !replyContent.trim()}
            className="self-end px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
          >
            Responder
          </button>
        </form>
      )}

      {loading && <p className="text-xs text-center" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>}

      <div className="flex flex-col gap-3">
        {topLevel.map((c) => {
          const reps = replies(c.id)
          const isExpanded = expanded.has(c.id)
          return (
            <div key={c.id} className="flex flex-col gap-2">
              {/* Comment card */}
              <div className="p-3 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="text-xs font-semibold hover:underline"
                        style={{ color: 'var(--brand-yellow)' }}
                        onClick={() => openProfile(c.userId)}
                      >
                        {c.displayName || c.username}
                      </button>
                      {c.rating && <StarRating value={c.rating} />}
                      <span className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm mt-1 break-words" style={{ color: 'var(--lv-text)' }}>{c.content}</p>
                  </div>
                  {c.userId === currentUserId && (
                    <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--lv-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button className="flex items-center gap-1 text-xs"
                    style={{ color: c.userVote === 'like' ? 'var(--brand-yellow)' : 'var(--lv-muted)' }}
                    onClick={() => handleVote(c.id, 'like')}>
                    <ThumbsUp size={13} /> {c.likes}
                  </button>
                  <button className="flex items-center gap-1 text-xs"
                    style={{ color: c.userVote === 'dislike' ? '#ff4444' : 'var(--lv-muted)' }}
                    onClick={() => handleVote(c.id, 'dislike')}>
                    <ThumbsDown size={13} /> {c.dislikes}
                  </button>
                  <button className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--lv-muted)' }}
                    onClick={() => setReplyTo({ id: c.id, username: c.username })}>
                    <Reply size={13} /> Responder
                  </button>
                  {reps.length > 0 && (
                    <button className="flex items-center gap-1 text-xs ml-auto"
                      style={{ color: 'var(--lv-muted)' }}
                      onClick={() => setExpanded((prev) => {
                        const s = new Set(prev)
                        if (s.has(c.id)) s.delete(c.id); else s.add(c.id)
                        return s
                      })}>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {reps.length} {reps.length === 1 ? 'resposta' : 'respostas'}
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {isExpanded && reps.map((r) => (
                <div key={r.id} className="ml-4 p-3 rounded-xl" style={{ background: 'var(--panel-2)', border: '1px solid var(--divider)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--brand-yellow)' }}
                          onClick={() => openProfile(r.userId)}
                        >
                          {r.displayName || r.username}
                        </button>
                        <span className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-1 break-words" style={{ color: 'var(--lv-text)' }}>{r.content}</p>
                    </div>
                    {r.userId === currentUserId && (
                      <button onClick={() => handleDelete(r.id)} style={{ color: 'var(--lv-muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button className="flex items-center gap-1 text-xs"
                      style={{ color: r.userVote === 'like' ? 'var(--brand-yellow)' : 'var(--lv-muted)' }}
                      onClick={() => handleVote(r.id, 'like')}>
                      <ThumbsUp size={13} /> {r.likes}
                    </button>
                    <button className="flex items-center gap-1 text-xs"
                      style={{ color: r.userVote === 'dislike' ? '#ff4444' : 'var(--lv-muted)' }}
                      onClick={() => handleVote(r.id, 'dislike')}>
                      <ThumbsDown size={13} /> {r.dislikes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
