import type { NavTab } from '../../lib/types'

interface Props {
  current: NavTab
  onChange: (tab: NavTab) => void
}

const TABS: { label: NavTab; icon: string }[] = [
  { label: 'Dashboard', icon: '⌂' },
  { label: 'Food Log', icon: '♨' },
  { label: 'Reports', icon: '▥' },
  { label: 'Goals', icon: '◎' },
]

export function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ label, icon }) => (
        <button
          key={label}
          className={`nav-item${current === label ? ' active' : ''}`}
          onClick={() => onChange(label)}
          aria-current={current === label ? 'page' : undefined}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
