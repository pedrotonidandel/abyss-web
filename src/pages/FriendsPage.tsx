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
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const d = await api.friends.list()
      setData(d as FriendListResponse)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} style={{ color: '#555' }}>
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold flex-1" style={{ color: '#e0e0e0' }}>Amigos</h2>
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
              background: tab === id ? '#00b4ff' : '#111111',
              color: tab === id ? '#000' : '#888',
              border: `1px solid ${tab === id ? '#00b4ff' : '#2a2a2a'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && tab !== 'search' ? (
          <div className="flex items-center justify-center h-20">
            <p className="text-sm" style={{ color: '#555' }}>Carregando…</p>
          </div>
        ) : tab === 'friends' ? (
          <div className="flex flex-col gap-2 pt-2">
            {data.friends.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#555' }}>Nenhum amigo ainda.</p>
            ) : data.friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <button className="flex-1 text-left" onClick={() => onOpenProfile(f.id)}>
                  <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>{f.displayName ?? f.username}</p>
                  <p className="text-xs" style={{ color: '#555' }}>@{f.username}</p>
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
                <p className="text-xs font-semibold" style={{ color: '#888' }}>Recebidos</p>
                {data.incoming.filter((r) => r.status === 'pending').map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <button className="flex-1 text-left" onClick={() => onOpenProfile(r.user.id)}>
                      <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>{r.user.displayName ?? r.user.username}</p>
                      <p className="text-xs" style={{ color: '#555' }}>@{r.user.username}</p>
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
                <p className="text-xs font-semibold" style={{ color: '#888' }}>Enviados</p>
                {data.outgoing.filter((r) => r.status === 'pending').map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                    <p className="text-sm font-medium flex-1" style={{ color: '#e0e0e0' }}>{r.user.displayName ?? r.user.username}</p>
                    <span className="text-xs" style={{ color: '#555' }}>Pendente</span>
                  </div>
                ))}
              </div>
            )}
            {data.incoming.filter((r) => r.status === 'pending').length === 0 &&
             data.outgoing.filter((r) => r.status === 'pending').length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: '#555' }}>Nenhum pedido pendente.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <Search size={16} style={{ color: '#555' }} />
              <input
                type="search"
                placeholder="Buscar usuários…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#e0e0e0' }}
              />
            </form>
            {searching && <p className="text-sm text-center" style={{ color: '#555' }}>Buscando…</p>}
            <div className="flex flex-col gap-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <button className="flex-1 text-left" onClick={() => onOpenProfile(u.id)}>
                    <p className="text-sm font-medium" style={{ color: '#e0e0e0' }}>{u.displayName ?? u.username}</p>
                    <p className="text-xs" style={{ color: '#555' }}>@{u.username}</p>
                  </button>
                  {u.relationship !== 'accepted' && (
                    <button
                      onClick={() => handleRequest(u.id)}
                      disabled={u.relationship === 'pending'}
                      style={{ color: u.relationship === 'pending' ? '#555' : '#00b4ff' }}
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
