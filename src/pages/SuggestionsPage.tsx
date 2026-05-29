import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, Plus, Send, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useAppStore } from '../store/useAppStore'
import type { Suggestion, SuggestionComment, SuggestionReactionGroup } from '../types'

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '💡', '👀', '🙏']

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

// ── SuggestionDetail ─────────────────────────────────────────────────────────

function SuggestionDetail({
  suggestion,
  currentUserId,
  onBack,
}: {
  suggestion: Suggestion
  currentUserId: number
  onBack: () => void
}) {
  const [comments, setComments] = useState<SuggestionComment[]>([])
  const [reactions, setReactions] = useState<SuggestionReactionGroup[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadDetails()
  }, [suggestion.id])

  const loadDetails = async () => {
    try {
      const [c, r] = await Promise.all([
        api.suggestions.listComments(suggestion.id),
        api.suggestions.listReactions(suggestion.id),
      ])
      setComments(c)
      setReactions(r)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      await api.suggestions.toggleReaction(suggestion.id, emoji)
      const r = await api.suggestions.listReactions(suggestion.id)
      setReactions(r)
    } catch { /* ignore */ }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      const c = await api.suggestions.addComment(suggestion.id, newComment.trim())
      setComments((prev) => [...prev, c])
      setNewComment('')
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.suggestions.deleteComment(suggestion.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch { /* ignore */ }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  const authorName = suggestion.displayName ?? suggestion.username

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: 'var(--panel)', borderBottom: '1px solid var(--divider)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
          style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-muted)' }}
        >
          <ArrowLeft size={14} />
        </button>
        <h2 className="text-base font-bold flex-1 truncate" style={{ color: 'var(--lv-text)' }}>
          {suggestion.title}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Suggestion body */}
        <div className="py-4 mt-3 p-4 rounded-2xl" style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => openProfile(suggestion.userId)} className="shrink-0">
              <UserAvatar name={authorName} avatarUrl={suggestion.avatarUrl} size={32} />
            </button>
            <div>
              <button
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--brand-yellow)' }}
                onClick={() => openProfile(suggestion.userId)}
              >
                {authorName}
              </button>
              <p className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(suggestion.createdAt)}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--lv-text)' }}>{suggestion.description}</p>
        </div>

        {/* Reactions */}
        <div className="flex flex-wrap gap-2 py-3" style={{ borderBottom: '1px solid var(--divider)' }}>
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
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: 'var(--lv-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>{comments.length} comentários</span>
          </div>

          {loading && <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>}

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
                    <span className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--lv-text)' }}>{c.content}</p>
                </div>
                {c.userId === currentUserId && (
                  <button className="mt-1" style={{ color: 'var(--lv-muted)' }} onClick={() => handleDeleteComment(c.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}

          <form onSubmit={handleComment} className="flex gap-2 mt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escrever comentário…"
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
    </div>
  )
}

// ── NewSuggestionForm ─────────────────────────────────────────────────────────

function NewSuggestionForm({ onCreated, onCancel }: { onCreated: (s: Suggestion) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const s = await api.suggestions.create({ title: title.trim(), description: description.trim() })
      onCreated(s)
    } catch {
      setError('Erro ao enviar sugestão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: 'var(--panel)', borderBottom: '1px solid var(--divider)' }}>
        <button onClick={onCancel} style={{ color: 'var(--lv-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Nova sugestão</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 rounded-2xl"
          style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--lv-muted)' }}>Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo da sua ideia…"
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
              placeholder="Descreva sua sugestão com mais detalhes…"
              rows={6}
              className="rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'var(--chip)', color: 'var(--lv-muted)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
            >
              {submitting ? 'Enviando…' : 'Publicar sugestão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  currentUserId,
  onClick,
  onDelete,
}: {
  suggestion: Suggestion
  currentUserId: number
  onClick: () => void
  onDelete: () => void
}) {
  const [reactions, setReactions] = useState<SuggestionReactionGroup[]>([])
  const [reacted, setReacted] = useState<string | null>(null)
  const [showReactions, setShowReactions] = useState(false)

  const authorName = suggestion.displayName ?? suggestion.username

  useEffect(() => {
    api.suggestions.listReactions(suggestion.id)
      .then((r) => {
        setReactions(r)
        const myReaction = r.find((g) => g.userIds.includes(currentUserId))
        setReacted(myReaction?.emoji ?? null)
      })
      .catch(() => {})
  }, [suggestion.id])

  const handleReaction = async (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation()
    try {
      await api.suggestions.toggleReaction(suggestion.id, emoji)
      const r = await api.suggestions.listReactions(suggestion.id)
      setReactions(r)
      const myReaction = r.find((g) => g.userIds.includes(currentUserId))
      setReacted(myReaction?.emoji ?? null)
    } catch { /* ignore */ }
    setShowReactions(false)
  }

  const totalReactions = reactions.reduce((sum, g) => sum + g.count, 0)
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div
      className="p-4 rounded-2xl cursor-pointer"
      style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}
      onClick={onClick}
    >
      {/* Author */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={(e) => { e.stopPropagation(); openProfile(suggestion.userId) }} className="shrink-0">
          <UserAvatar name={authorName} avatarUrl={suggestion.avatarUrl} size={28} />
        </button>
        <div className="flex-1 min-w-0">
          <button
            className="text-xs font-semibold hover:underline truncate"
            style={{ color: 'var(--brand-yellow)' }}
            onClick={(e) => { e.stopPropagation(); openProfile(suggestion.userId) }}
          >
            {authorName}
          </button>
          <p className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>{formatDate(suggestion.createdAt)}</p>
        </div>
        {suggestion.userId === currentUserId && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="shrink-0"
            style={{ color: 'var(--lv-muted)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--lv-text)' }}>{suggestion.title}</h3>
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--lv-muted)' }}>{suggestion.description}</p>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
        {/* Reaction picker */}
        <div className="relative">
          <button
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
            style={{
              background: reacted ? 'oklch(0.85 0.17 90 / 0.12)' : 'var(--chip)',
              border: `1px solid ${reacted ? 'var(--brand-yellow)' : 'var(--divider)'}`,
              color: reacted ? 'var(--brand-yellow)' : 'var(--lv-muted)',
            }}
            onClick={(e) => { e.stopPropagation(); setShowReactions((v) => !v) }}
          >
            <span>{reacted ?? '😊'}</span>
            {totalReactions > 0 && <span>{totalReactions}</span>}
            {showReactions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 rounded-xl z-10"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--divider)' }}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} className="text-base hover:scale-125 transition-transform"
                  onClick={(e) => handleReaction(e, emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs"
          style={{ background: 'var(--chip)', borderRadius: 999, padding: '2px 8px', color: 'var(--lv-muted)' }}>
          <MessageSquare size={12} />
          <span>{suggestion.commentCount}</span>
        </div>
      </div>
    </div>
  )
}

// ── SuggestionsPage ────────────────────────────────────────────────────────────

type View = 'list' | 'new' | { detail: Suggestion }

interface SuggestionsPageProps {
  onBack: () => void
}

export function SuggestionsPage({ onBack }: SuggestionsPageProps) {
  const { user } = useAppStore()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.suggestions.list()
      setSuggestions(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleCreated = (s: Suggestion) => {
    setSuggestions((prev) => [s, ...prev])
    setView('list')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta sugestão?')) return
    try {
      await api.suggestions.remove(id)
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch { /* ignore */ }
  }

  if (!user) return null

  if (view === 'new') {
    return <NewSuggestionForm onCreated={handleCreated} onCancel={() => setView('list')} />
  }

  if (typeof view === 'object' && 'detail' in view) {
    return (
      <SuggestionDetail
        suggestion={view.detail}
        currentUserId={user.id}
        onBack={() => setView('list')}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between"
        style={{ background: 'var(--panel)', borderBottom: '1px solid var(--divider)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: 'var(--lv-muted)' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-base font-bold" style={{ color: 'var(--lv-text)' }}>Sugestões</h2>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--chip)', color: 'var(--lv-muted)' }}>
            {suggestions.length}
          </span>
        </div>
        <button
          onClick={() => setView('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
        >
          <Plus size={14} />
          Nova
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Nenhuma sugestão ainda.</p>
            <button
              onClick={() => setView('new')}
              className="text-xs px-4 py-2 rounded-xl"
              style={{ background: 'var(--brand-yellow)', color: '#0d111a', fontWeight: 700 }}
            >
              Seja o primeiro a sugerir!
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                currentUserId={user.id}
                onClick={() => setView({ detail: s })}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
