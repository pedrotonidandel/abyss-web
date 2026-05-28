import { Home, Search, Heart, Bell, User } from 'lucide-react'
import { AbyssLogo } from '../ui/AbyssLogo'

const NAV = [
  { id: 'home',     label: 'Início',     icon: Home   },
  { id: 'browse',   label: 'Descobrir',  icon: Search },
  { id: 'library',  label: 'Biblioteca', icon: Heart  },
  { id: 'releases', label: 'Novidades',  icon: Bell   },
  { id: 'profile',  label: 'Perfil',     icon: User   },
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  unreadCount?: number
}

export function Sidebar({ activePage, onNavigate, unreadCount = 0 }: Props) {
  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{ width: 216, background: '#111111', borderRight: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <AbyssLogo size={26} />
        <span
          className="font-bold text-base tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #7c5cff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Abyss
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-3 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activePage === id
          const badge = id === 'releases' && unreadCount > 0
          return (
            <button
              key={id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left"
              style={{
                background: active ? '#1e1e1e' : 'transparent',
                color: active ? '#e0e0e0' : '#555',
                transition: 'background 0.15s, color 0.15s',
              }}
              onClick={() => onNavigate(id)}
            >
              <div className="relative shrink-0">
                <Icon
                  size={17}
                  strokeWidth={active ? 2.3 : 1.8}
                  style={{ color: active ? '#00b4ff' : '#555' }}
                />
                {badge && (
                  <span
                    className="absolute rounded-full"
                    style={{ width: 6, height: 6, background: '#00b4ff', top: -2, right: -2 }}
                  />
                )}
              </div>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-[10px]" style={{ color: '#2a2a2a' }}>Abyss Web PWA</p>
      </div>
    </aside>
  )
}
