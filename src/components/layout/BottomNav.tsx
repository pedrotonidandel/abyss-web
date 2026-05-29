import { Home, Search, Heart, User } from 'lucide-react'

const NAV = [
  { id: 'home',    icon: Home   },
  { id: 'browse',  icon: Search },
  { id: 'library', icon: Heart  },
  { id: 'profile', icon: User   },
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  libraryBadge?: boolean
}

export function BottomNav({
  activePage,
  onNavigate,
  libraryBadge,
}: Props) {
  return (
    <nav
      className="shrink-0 pb-safe"
      style={{ background: 'var(--panel)', borderTop: '1px solid var(--divider)' }}
    >
      <div className="flex items-center" style={{ height: 58 }}>
        {NAV.map(({ id, icon: Icon }) => {
          const active = activePage === id
          const showBadge = id === 'library' && (libraryBadge ?? false)
          return (
            <button
              key={id}
              className="flex-1 flex items-center justify-center h-full"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              onClick={() => onNavigate(id)}
            >
              <div
                className="relative flex items-center justify-center rounded-2xl"
                style={{
                  width: 46,
                  height: 34,
                  background: active ? 'oklch(0.85 0.17 90 / 0.12)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.7}
                  style={{ color: active ? 'var(--brand-yellow)' : 'oklch(0.40 0.01 240)' }}
                />
                {showBadge && (
                  <span
                    className="absolute rounded-full"
                    style={{ width: 6, height: 6, background: 'var(--brand-yellow)', top: 4, right: 5 }}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
