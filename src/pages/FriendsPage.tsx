import { useState, useEffect } from 'react'
import { Search, ArrowLeft, UserPlus, Check, X, UserMinus } from 'lucide-react'
import { api } from '../api'
import type { FriendUser, FriendRequest } from '../types'

interface FriendListResponse {
  friends: FriendUser[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}

interface FriendSearchResult extends FriendUser {
  relationship: 'pending' | 'accepted' | null
}

interface FriendsPageProps {
  onBack: () => void
  onOpenProfile: (userId: number) => void
}

export function FriendsPage({ onBack, onOpenProfile }: FriendsPageProps) {
  const [data, setData] = useState<FriendListResponse>({ friends: [], incoming: [], outgoing: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.friends.list()
      setData(d as FriendListResponse)
    } catch { setLoadError(true) } finally { setLoading(false) }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await api.friends.search(searchQuery.trim())
      setSearchResults(results as FriendSearchResult[])
    } catch { /* ignore */ } finally {
      setSearching(false)
    }
  }

  const handleRequest = async (userId: number) => {
    try {
      await api.friends.request(userId)
      await load()
      const results = await api.friends.search(searchQuery.trim())
      setSearchResults(results as FriendSearchResult[])
    } catch { /* ignore */ }
  }

  const handleRespond = async (friendshipId: number, accept: boolean) => {
    try {
      await api.friends.respond(friendshipId, accept)
      await load()
    } catch { /* ignore */ }
  }

  const handleRemove = async (userId: number) => {
    try {
      await api.friends.remove(userId)
      await load()
    } catch { /* ignore */ }
  }

  const pendingCount = data.incoming.filter((r) => r.status === 'pending').length

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} style={{ color: 'var(--lv-muted)' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold flex-1" style={{ color: 'var(--lv-text)' }}>Amigos</h2>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex px-4 gap-2 pb-2">
        {([
          { id: 'friends' as const, label: `Amigos (${data.friends.length})` },
          { id: 'requests' as const, label: `Pedidos${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { id: 'search' as const, label: 'Buscar' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: tab === id ? 'var(--brand-yellow)' : 'var(--chip)',
              color:      tab === id ? '#0d111a'              : 'var(--lv-muted)',
              border:     `1px solid ${tab === id ? 'transparent' : 'var(--divider)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loadError && tab !== 'search' && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--lv-muted)', marginBottom: 12 }}>
              Não foi possível carregar seus amigos.
            </p>
            <button
              onClick={() => { setLoadError(false); load() }}
              style={{
                padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: 'var(--brand-yellow)', color: '#0d111a', border: 'none', cursor: 'pointer',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}
        {loading && tab !== 'search' ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm" style={{ color: 'var(--lv-muted)' }}>Carregando…</p>
          </div>
        ) : tab === 'friends' ? (
          <div className="flex flex-col gap-2 pt-2">
            {data.friends.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--lv-muted)' }}>Nenhum amigo ainda.</p>
            ) : data.friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
                <button className="flex-1 text-left" onClick={() => onOpenProfile(f.id)}>
                  <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>{f.displayName ?? f.username}</p>
                  <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>@{f.username}</p>
                </button>
                <button onClick={() => handleRemove(f.id)} style={{ color: '#ff4444' }}>
                  <UserMinus size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : tab === 'requests' ? (
          <div className="flex flex-col gap-3 pt-2">
            {data.incoming.filter((r) => r.status === 'pending').length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--lv-muted)' }}>Recebidos</p>
                {data.incoming.filter((r) => r.status === 'pending').map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
                    <button className="flex-1 text-left" onClick={() => onOpenProfile(r.user.id)}>
                      <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>{r.user.displayName ?? r.user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>@{r.user.username}</p>
                    </button>
                    <button onClick={() => handleRespond(r.id, true)} style={{ color: '#22c55e' }}>
                      <Check size={20} />
                    </button>
                    <button onClick={() => handleRespond(r.id, false)} style={{ color: '#ff4444' }}>
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {data.outgoing.filter((r) => r.status === 'pending').length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--lv-muted)' }}>Enviados</p>
                {data.outgoing.filter((r) => r.status === 'pending').map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
                    <p className="text-sm font-medium flex-1" style={{ color: 'var(--lv-text)' }}>{r.user.displayName ?? r.user.username}</p>
                    <span className="text-xs" style={{ color: 'var(--lv-muted)' }}>Pendente</span>
                  </div>
                ))}
              </div>
            )}
            {data.incoming.filter((r) => r.status === 'pending').length === 0 &&
             data.outgoing.filter((r) => r.status === 'pending').length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--lv-muted)' }}>Nenhum pedido pendente.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
              <Search size={16} style={{ color: 'var(--lv-muted)' }} />
              <input
                type="search"
                placeholder="Buscar usuários…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--lv-text)' }}
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--brand-yellow)', color: '#0d111a' }}
              >
                Buscar
              </button>
            </form>
            {searching && <p className="text-sm text-center" style={{ color: 'var(--lv-muted)' }}>Buscando…</p>}
            <div className="flex flex-col gap-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--panel)', border: '1px solid var(--divider)' }}>
                  <button className="flex-1 text-left" onClick={() => onOpenProfile(u.id)}>
                    <p className="text-sm font-medium" style={{ color: 'var(--lv-text)' }}>{u.displayName ?? u.username}</p>
                    <p className="text-xs" style={{ color: 'var(--lv-muted)' }}>@{u.username}</p>
                  </button>
                  {u.relationship !== 'accepted' && (
                    <button
                      onClick={() => handleRequest(u.id)}
                      disabled={u.relationship === 'pending'}
                      style={{ color: u.relationship === 'pending' ? 'var(--lv-muted)' : 'var(--brand-yellow)' }}
                    >
                      <UserPlus size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
