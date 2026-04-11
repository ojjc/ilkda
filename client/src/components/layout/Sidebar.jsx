import { useState } from 'react'
import { TYPE_META, MEDIA_TYPES } from '@/lib/constants'
import { DashboardModal } from '@/components/ui/DashboardModal'
import styles from './Sidebar.module.css'

export function Sidebar({ user, entries, activeView, onViewChange, onProfileClick, onSignOut }) {
  const [dashOpen, setDashOpen] = useState(false)

  const [autohide, setAutoHide] = useState(
    () => localStorage.getItem('ilkda-sidebar-autohide') === 'true'
  )

  const [hovered, setHovered] = useState(false)

  const toggleAutoHide = () => {
    setAutoHide((prev) => {
      localStorage.setItem('ilkda-sidebar-autohide', String(!prev))
      return !prev
    })
  }

  const collapsed = autohide && !hovered

  const countFor = (type) => type === 'all' ? entries.length : entries.filter((e) => e.type === type).length

  const scopedEntries = activeView === 'all' ? entries : entries.filter((e) => e.type === activeView)

  const total = scopedEntries.length
  const completed = scopedEntries.filter((e) => e.status === 'completed').length
  const scored = scopedEntries.filter((e) => e.score > 0)
  const avg = scored.length ? (scored.reduce((s, e) => s + e.score, 0) / scored.length / 2).toFixed(1): '—'
  const typeCount = new Set(scopedEntries.map((e) => e.type)).size

  const scopeLabel = activeView === 'all' ? null : TYPE_META[activeView]?.label ?? activeView

  const sidebarClass = [
    styles.sidebar,
    autohide ? styles.sidebarAutoHide : '',
    collapsed ? styles.sidebarCollapsed : '',
  ].filter(Boolean).join(' ')

  return (
    <aside 
      className={sidebarClass}
      onMouseEnter={() => autohide && setHovered(true)}
      onMouseLeave={() => autohide && setHovered(false)}
    >
      {/* user widget */}
      <button className={styles.userWidget} onClick={onProfileClick}>
        <div className={styles.avatar}>
          {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span className={styles.avatarEmoji}>👤</span>}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userHandle}>@{user.username}</span>
        </div>
      </button>

      {/* nav */}
      <nav className={styles.nav}>
        <span className={styles.navLabel}>Browse</span>

        <NavItem
          label="All"
          dotColor="#e8e4df"
          count={countFor('all')}
          active={activeView === 'all'}
          onClick={() => onViewChange('all')}
        />

        {MEDIA_TYPES.map((type) => {
          const meta = TYPE_META[type]
          return (
            <NavItem
              key={type}
              label={meta.label}
              dotColor={meta.color}
              count={countFor(type)}
              active={activeView === type}
              onClick={() => onViewChange(type)}
            />
          )
        })}
      </nav>

      {/* stats */}
      <div className={styles.bottom}>
        <div className={styles.statsHeader}>
          <span className={styles.statsLabel}>Stats</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {scopeLabel && <span className={styles.statsScope}>{scopeLabel}</span>}
            <span className={styles.statsHint}>click to expand</span>
          </div>
        </div>
        <div className={styles.statsGrid} onClick={() => setDashOpen(true)}>
          <StatCell value={total} label="logged" />
          <StatCell value={completed} label="done" />
          <StatCell value={avg} label="avg score" />
          <StatCell value={typeCount} label="categories" />
        </div>

        <div className={styles.bottomBtns}>
          <button className={styles.signOutBtn} onClick={onSignOut}>Sign Out</button>
          <button 
            className={`${styles.autohideBtn} ${autohide ? styles.autohideBtnActive: ''}`}
            onClick={toggleAutoHide}
            title={autohide ? 'Disable Autohide' : 'Enable Autohide'}
          >
            {autohide ? '<' : '>'}
          </button>
        </div>

      </div>

      {/* dashboard model */}
      {dashOpen && (
        <DashboardModal
          entries={scopedEntries}
          scopeLabel={scopeLabel}
          onClose={() => setDashOpen(false)}
        />
      )}
    </aside>
  )
}

function NavItem({ label, dotColor, count, active, onClick }) {
  return (
    <button
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.navDot} style={{ background: dotColor }} />
      <span className={styles.navLabel2}>{label}</span>
      <span className={styles.navCount}>{count}</span>
    </button>
  )
}

function StatCell({ value, label, onClick }) {
  return (
    <button className={styles.statCell} onClick={onClick} type="button" title="Open dashboard">
      <span className={styles.statNum}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </button>
  )
}
