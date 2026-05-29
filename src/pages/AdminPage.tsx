import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Shield, ShieldOff } from 'lucide-react'
import { api } from '../api'
import type { AdminUserSummary, BugReport, AppRelease } from '../types'

type AdminTab = 'releases' | 'users' | 'bugs'

interface AdminPageProps {
  onBack: () => void
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [tab, setTab] = useState<AdminTab>('releases')

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} style={{ color: 'var(--lv-muted)' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold flex-1" style={{ color: 'var(--lv-text)' }}>Admin</h2>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex px-4 gap-2 pb-2">
        {([
          { id: 'releases' as const, label: 'Versões' },
          { id: 'users' as const, label: 'Usuários' },
          { id: 'bugs' as const, label: 'Bugs' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: tab === id ? 'var(--brand-yellow)' : 'var(--chip)',
              color: tab === id ? '#0d111a' : 'var(--lv-muted)',
              border: `1px solid ${tab === id ? 'var(--brand-yellow)' : 'var(--divider)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'releases' && <AdminReleasesTab />}
        {tab === 'users' && <AdminUsersTab />}
        {tab === 'bugs' && <AdminBugsTab />}
      </div>
    </div>
  )
}

function AdminReleasesTab() {
  const [releases, setReleases] = useState<AppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [changelog, setChangelog] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.releases.list()
      setReleases(r)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.admin.createRelease({ version, title, changelog })
      setVersion(''); setTitle(''); setChangelog('')
      setShowForm(false)
      await load()
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteRelease(id)
      await load()
    } catch { /* ignore */ }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--chip)', border: '1px solid var(--divider)', color: 'var(--lv-text)',
    borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%',
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-4">
      <button
        className="w-full py-2.5 rounded-xl text-sm font-bold mt-3 mb-3"
        style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? 'Cancelar' : '+ Nova versão'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 mb-4 p-4 rounded-2xl"
          style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
          <input placeholder="Versão (ex: 1.2.3)" value={version} onChange={(e) => setVersion(e.target.value)} required style={inputStyle} />
          <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
          <textarea placeholder="Changelog…" value={changelog} onChange={(e) => setChangelog(e.target.value)} required rows={5}
            style={{ ...inputStyle, background: 'var(--panel-2)', resize: 'vertical' }} />
          <button type="submit" disabled={submitting} className="py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}>
            {submitting ? 'Publicando…' : 'Publicar'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-center" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {releases.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>v{r.version} — {r.title}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--lv-muted)' }}>{r.changelog}</p>
              </div>
              <button onClick={() => handleDelete(r.id)} style={{ color: '#ef4444' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await api.admin.listUsers())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleToggleAdmin = async (userId: number, isAdmin: boolean) => {
    try {
      await api.admin.setUserAdmin(userId, !isAdmin)
      await load()
    } catch { /* ignore */ }
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-4">
      {loading ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>{u.displayName ?? u.username}</p>
                <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>@{u.username} · {u.libraryCount} itens · {u.commentCount} comentários</p>
              </div>
              <button onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                style={{ color: u.isAdmin ? 'var(--brand-yellow)' : 'var(--lv-muted)' }}>
                {u.isAdmin ? <Shield size={18} /> : <ShieldOff size={18} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const BUG_STATUS_LABELS: Record<BugReport['status'], string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  resolvido: 'Resolvido',
}

const BUG_STATUS_COLORS: Record<BugReport['status'], string> = {
  aberto: '#ef4444',
  em_analise: '#f59e0b',
  resolvido: '#22c55e',
}

function AdminBugsTab() {
  const [bugs, setBugs] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      setBugs(await api.admin.listBugs())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const handleStatus = async (id: number) => {
    const next: BugReport['status'][] = ['aberto', 'em_analise', 'resolvido']
    const current = bugs.find((b) => b.id === id)?.status ?? 'aberto'
    const nextStatus = next[(next.indexOf(current) + 1) % 3]
    try {
      await api.admin.updateBug(id, nextStatus)
      await load()
    } catch { /* ignore */ }
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-4">
      {loading ? (
        <div className="flex items-center justify-center h-20">
          <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-3">
          {bugs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--lv-muted)' }}>Nenhum bug reportado.</p>
          ) : bugs.map((b) => (
            <div key={b.id} className="p-3 rounded-xl flex flex-col gap-1.5"
              style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1" style={{ color: 'var(--lv-text)' }}>{b.title}</p>
                <button
                  onClick={() => handleStatus(b.id)}
                  className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: 'var(--chip)',
                    border: '1px solid var(--divider)',
                    color: BUG_STATUS_COLORS[b.status],
                  }}
                >
                  {BUG_STATUS_LABELS[b.status]}
                </button>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--lv-muted)' }}>{b.description}</p>
              <p className="text-[10px]" style={{ color: 'var(--lv-muted)' }}>
                {b.displayName ?? b.username} · {b.category} · {new Date(b.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
