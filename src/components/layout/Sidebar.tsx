/**
 * Sidebar — tablet/desktop only (md+).
 * User profile lives in the tablet header (App.tsx), not here.
 */
import { Home, Search, Library, Settings, Bug, Lightbulb, HelpCircle } from 'lucide-react'

const MAIN_NAV = [
  { id: 'home',    label: 'Início',    icon: Home    },
  { id: 'browse',  label: 'Descobrir', icon: Search  },
  { id: 'library', label: 'Biblioteca', icon: Library },
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  onBugReport?: () => void
  onSuggestion?: () => void
}

export function Sidebar({ activePage, onNavigate, onBugReport, onSuggestion }: Props) {

  const navItem = (id: string, label: string, Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>) => {
    const active = activePage === id
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 8,
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
          background: 'transparent',
          color: active ? 'var(--lv-text)' : 'var(--lv-muted)',
          fontWeight: active ? 600 : 500,
          fontSize: 15,
          transition: 'color 0.15s',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-text)' }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-muted)' }}
      >
        <Icon
          size={20}
          strokeWidth={active ? 2.2 : 1.7}
          style={{ color: active ? 'var(--lv-text)' : 'var(--lv-muted)', flexShrink: 0 }}
        />
        {label}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: 220, flexShrink: 0, height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* ── Wordmark — padding-top respects safe-area (iPad Stage Manager / notch) ── */}
      <div style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
        paddingLeft: 20, paddingRight: 20, paddingBottom: 20,
      }}>
        <span style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700, fontSize: 22,
          letterSpacing: '-0.5px', color: '#ffffff',
        }}>
          abyss
        </span>
      </div>

      {/* ── Main nav ── */}
      <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MAIN_NAV.map(({ id, label, icon }) => navItem(id, label, icon))}
      </nav>

      {/* ── Separator ── */}
      <div style={{ margin: '12px 16px', borderTop: '1px solid var(--divider)' }} />

      {/* ── Settings nav ── */}
      <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItem('settings', 'Ajustes', Settings)}
      </nav>

      <div style={{ flex: 1 }} />

      {/* ── Footer: version + action icons ── */}
      <div style={{ padding: '8px 12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
          <button
            onClick={() => onNavigate('releases')}
            title="Ver novidades e versões"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flex: 1, textAlign: 'left' }}
          >
            <span style={{ fontSize: 10, color: 'oklch(0.35 0.012 235)' }}>
              v{__APP_VERSION__} · Abyss Web
            </span>
          </button>
          <button
            title="Reportar bug"
            onClick={() => onBugReport?.()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'oklch(0.40 0.01 240)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-muted)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.40 0.01 240)' }}
          >
            <Bug size={13} />
          </button>
          <button
            title="Sugestões"
            onClick={() => onSuggestion?.()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'oklch(0.40 0.01 240)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-muted)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.40 0.01 240)' }}
          >
            <Lightbulb size={13} />
          </button>
          <button
            title="Ajuda"
            onClick={() => window.open('https://wa.me/5537999922220?text=Suporte+Abyss', '_blank')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'oklch(0.40 0.01 240)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--lv-muted)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.40 0.01 240)' }}
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
