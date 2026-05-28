import { useState } from 'react'
import { api, ApiError } from '../api'
import { AbyssLogo } from '../components/ui/AbyssLogo'
import type { User } from '../types'

interface LoginPageProps {
  onSuccess: (user: User) => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user: User
      if (mode === 'login') {
        user = await api.auth.login({ email, password })
      } else {
        user = await api.auth.register({ username, email, password })
      }
      onSuccess(user)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Erro inesperado. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#e0e0e0',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="flex flex-col items-center justify-center h-dvh px-6" style={{ background: '#0d0d0d' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <AbyssLogo size={56} />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: '#e0e0e0' }}>Abyss</h1>
            <p className="text-sm mt-1" style={{ color: '#555' }}>Seu hub de entretenimento</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: '#1a1a1a' }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                className="flex-1 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: mode === m ? '#00b4ff' : 'transparent',
                  color: mode === m ? '#000' : '#555',
                }}
                onClick={() => { setMode(m); setError('') }}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={inputStyle}
                autoComplete="username"
              />
            )}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error && (
              <p className="text-sm px-1" style={{ color: '#ff4444' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-1 disabled:opacity-50"
              style={{ background: '#00b4ff', color: '#000' }}
            >
              {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
