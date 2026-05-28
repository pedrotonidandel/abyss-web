import { Home, BookOpen, Library, Bell, User } from 'lucide-react'

const ACCENT = '#00b4ff'

const navItems = [
  { id: 'home',         label: 'Início',     icon: Home },
  { id: 'browse',       label: 'Catálogo',   icon: BookOpen },
  { id: 'library',      label: 'Biblioteca', icon: Library },
  { id: 'releases',     label: 'Novidades',  icon: Bell },
  { id: 'profile',      label: 'Perfil',     icon: User },
]

interface BottomNavProps {
  activePage: string
  onNavigate: (page: string) => void
  unreadCount?: number
}

export function BottomNav({ activePage, onNavigate, unreadCount = 0 }: BottomNavProps) {
  return (
    <nav
      className="shrink-0 pb-safe"
      style={{ background: '#111111', borderTop: '1px solid #1e1e1e' }}
    >
      <div className="flex items-stretch">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id
          const showBadge = id === 'releases' && unreadCount > 0
          return (
            <button
              key={id}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-opacity"
              style={{ color: active ? ACCENT : '#555', opacity: active ? 1 : 0.8 }}
              onClick={() => onNavigate(id)}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-0.5"
                    style={{ background: ACCENT, color: '#000' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
