import { Home, Search, Heart, Bell, User } from 'lucide-react'

const NAV = [
  { id: 'home',     icon: Home    },
  { id: 'browse',   icon: Search  },
  { id: 'library',  icon: Heart   },
  { id: 'releases', icon: Bell    },
  { id: 'profile',  icon: User    },
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  unreadCount?: number
}

export function BottomNav({ activePage, onNavigate, unreadCount = 0 }: Props) {
  return (
    <nav
      className="shrink-0 pb-safe"
      style={{ background: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center" style={{ height: 56 }}>
        {NAV.map(({ id, icon: Icon }) => {
          const active = activePage === id
          const badge = id === 'releases' && unreadCount > 0
          return (
            <button
              key={id}
              className="flex-1 flex items-center justify-center h-full"
              onClick={() => onNavigate(id)}
            >
              <div
                className="relative flex items-center justify-center rounded-2xl"
                style={{
                  width: 46,
                  height: 34,
                  background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.7}
                  style={{ color: active ? '#ffffff' : '#484848' }}
                />
                {badge && (
                  <span
                    className="absolute rounded-full"
                    style={{ width: 7, height: 7, background: '#00b4ff', top: 4, right: 5 }}
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
