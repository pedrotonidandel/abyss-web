import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api, ApiError } from '../api'
import type { User } from '../types'

interface LoginPageProps {
  onSuccess: (user: User) => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [loginId, setLoginId]   = useState('')   // email OR @username (login only)
  const [email, setEmail]       = useState('')   // register only
  const [username, setUsername] = useState('')   // register only
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user: User
      if (mode === 'login') {
        // Backend accepts the input in the `email` field for both email and
        // @username — it does its own detection internally via email_hash vs
        // username normalisation. Always pass in `email` field.
        user = await api.auth.login({ email: loginId.replace(/^@/, ''), password })
      } else {
        user = await api.auth.register({ username, email, password })
      }
      onSuccess(user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setError('')
    setLoginId('')
    setEmail('')
    setUsername('')
    setPassword('')
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'oklch(0.20 0.013 240)',
    border: '1.5px solid var(--divider)',
    borderRadius: 12,
    color: 'var(--lv-text)',
    fontSize: 16,
    outline: 'none',
    fontFamily: 'Inter, system-ui, sans-serif',
    WebkitAppearance: 'none',
    boxSizing: 'border-box',
  }

  const features = [
    'Filmes e séries em um só lugar',
    'Animes, livros e jogos',
    'Catálogo atualizado diariamente',
    'Interface rápida e sem anúncios',
  ]

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .login-left-panel { display: none !important; }
          .login-card {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
        @media (min-width: 768px) {
          .login-mobile-wordmark { display: none !important; }
          .login-root {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 40px 24px !important;
          }
          .login-root > .login-inner {
            flex-direction: row !important;
            align-items: stretch !important;
            max-width: 900px !important;
            width: 100% !important;
            gap: 48px !important;
          }
        }
      `}</style>

      <div
        className="login-root"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--app-bg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Ambient gradient blobs ── */}
        <div style={{
          position: 'absolute', top: '-10%', left: '15%',
          width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,150,255,0.09) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-5%',
          width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, oklch(0.85 0.17 90 / 0.07) 0%, transparent 65%)',
        }} />

        {/* ── Inner wrapper ── */}
        <div
          className="login-inner"
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            margin: '0 auto',
          }}
        >

          {/* ── LEFT PANEL (desktop only) ── */}
          <div
            className="login-left-panel"
            style={{
              flex: '0 0 45%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingRight: 8,
            }}
          >
            <h1 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: '-1.5px',
              color: '#ffffff',
              margin: 0,
              lineHeight: 1,
            }}>
              abyss
            </h1>
            <p style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 16,
              color: 'var(--lv-muted)',
              margin: '14px 0 36px',
            }}>
              Seu hub de entretenimento
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(0,180,255,0.12)',
                    border: '1.5px solid rgba(0,180,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'rgba(0,180,255,0.9)',
                  }}>
                    ✓
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--lv-text)', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: mobile header + form ── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Mobile-only wordmark */}
            <div
              className="login-mobile-wordmark"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 'calc(env(safe-area-inset-top) + 60px)',
                paddingBottom: 36,
                textAlign: 'center',
              }}
            >
              <h1 style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(52px, 16vw, 72px)',
                letterSpacing: '-1px',
                color: '#ffffff',
                margin: 0,
                lineHeight: 1,
              }}>
                abyss
              </h1>
              <p style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 14,
                color: 'var(--lv-muted)',
                margin: '10px 0 0',
                letterSpacing: '0.1px',
              }}>
                Seu hub de entretenimento
              </p>
            </div>

            {/* Form card */}
            <div
              className="login-card"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '36px',
                background: 'var(--panel)',
                border: '1px solid var(--divider)',
                borderRadius: 20,
                boxSizing: 'border-box',
              }}
            >
              {/* Mobile: form fills width with 24px side padding */}
              <div style={{ padding: '0 0', boxSizing: 'border-box' }} className="login-card-inner">
                <style>{`
                  @media (max-width: 767px) {
                    .login-card-inner {
                      padding: 0 24px calc(env(safe-area-inset-bottom) + 32px) !important;
                    }
                  }
                `}</style>

                {/* Tab switcher */}
                <div style={{
                  display: 'flex',
                  background: 'oklch(0.20 0.013 240)',
                  borderRadius: 14,
                  padding: 4,
                  marginBottom: 24,
                  border: '1px solid var(--divider)',
                }}>
                  {(['login', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 15,
                        fontWeight: mode === m ? 700 : 500,
                        fontFamily: mode === m ? "'Poppins', sans-serif" : 'Inter, system-ui, sans-serif',
                        background: mode === m ? 'var(--panel-2)' : 'transparent',
                        color: mode === m ? '#ffffff' : 'var(--lv-muted)',
                        transition: 'all 0.18s',
                        letterSpacing: mode === m ? '-0.2px' : '0px',
                      }}
                    >
                      {m === 'login' ? 'Entrar' : 'Cadastrar'}
                    </button>
                  ))}
                </div>

                {/* Fields */}
                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {/* Register: username */}
                  {mode === 'register' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        Nome de usuário
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                        placeholder="@seunome"
                        style={inputBase}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                      />
                    </div>
                  )}

                  {/* Login: email or username / Register: email */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      {mode === 'login' ? 'Email ou usuário' : 'E-mail'}
                    </label>
                    {mode === 'login' ? (
                      <input
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        required
                        placeholder="email@exemplo.com ou @usuario"
                        autoComplete="username email"
                        style={inputBase}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                      />
                    ) : (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="email@exemplo.com"
                        autoComplete="email"
                        style={inputBase}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                      />
                    )}
                  </div>

                  {/* Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        style={{ ...inputBase, paddingRight: 48 }}
                        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,180,255,0.4)' }}
                        onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'var(--divider)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        style={{
                          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 4, color: 'var(--lv-muted)',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.4 }}>{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      height: 48,
                      marginTop: 4,
                      borderRadius: 12,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? 'oklch(0.85 0.17 90 / 0.5)' : 'var(--brand-yellow)',
                      color: '#0d111a',
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: "'Poppins', sans-serif",
                      letterSpacing: '-0.2px',
                      transition: 'opacity 0.15s, transform 0.1s',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                </form>

                {/* Footer note */}
                <p style={{
                  marginTop: 20,
                  fontSize: 12,
                  color: 'var(--lv-muted)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                  opacity: 0.6,
                }}>
                  Ao continuar, você concorda com os termos de uso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
