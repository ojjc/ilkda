import { useState } from 'react'
import { TYPE_META, MEDIA_TYPES } from '@/lib/constants'
import { DashboardModal } from '@/components/ui/DashboardModal'
import styles from './Sidebar.module.css'

export function Sidebar({ user, entries, activeView, onViewChange, onProfileClick, onSignOut }) {
  const [dashOpen, setDashOpen] = useState(false)

  const countFor = (type) => type === 'all' ? entries.length : entries.filter((e) => e.type === type).length

  const scopedEntries = activeView === 'all' ? entries : entries.filter((e) => e.type === activeView)

  const total = scopedEntries.length
  const completed = scopedEntries.filter((e) => e.status === 'completed').length
  const scored = scopedEntries.filter((e) => e.score > 0)
  const avg = scored.length ? (scored.reduce((s, e) => s + e.score, 0) / scored.length / 2).toFixed(1): '—'
  const typeCount = new Set(scopedEntries.map((e) => e.type)).size

  const scopeLabel = activeView === 'all' ? null : TYPE_META[activeView]?.label ?? activeView

  return (
    <aside className={styles.sidebar}>
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

        <button className={styles.signOutBtn} onClick={onSignOut}>
          Sign out
        </button>
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
