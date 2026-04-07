import { useState, useRef } from 'react'
import { EditProfileModal } from './EditProfileModal'
import { profileApi } from '@/lib/api'
import { resizeImage } from '@/lib/image'
import { TYPE_META, STATUS_META, MEDIA_TYPES } from '@/lib/constants'
import styles from './ProfilePage.module.css'

export function ProfilePage({ user, entries, onUserUpdate, onBack, onToast }) {
  const [editOpen, setEditOpen] = useState(false)
  const avatarInputRef = useRef(null)

  // stats derived from entries
  const total = entries.length
  const completed = entries.filter((e) => e.status === 'completed').length
  const scored = entries.filter((e) => e.score > 0)
  const avg = scored.length ? (scored.reduce((s, e) => s + e.score, 0) / scored.length / 2).toFixed(1) : '—'
  const typeCount = new Set(entries.map((e) => e.type)).size
  const maxCount = Math.max(1, ...MEDIA_TYPES.map((t) => entries.filter((e) => e.type === t).length))

  const pinned = entries.filter((e) => e.pinned).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  // handlers
  const handleSaveProfile = async (payload) => {
    const { user: updated } = await profileApi.update(payload)
    onUserUpdate(updated)
    onToast('Profile updated')
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const raw = ev.target.result
        const avatar = await resizeImage(raw, 300)
        const { user: updated } = await profileApi.updateAvatar(avatar)
        onUserUpdate(updated)
        onToast('Profile photo updated')
      }
      reader.readAsDataURL(file)
    } catch {
      onToast('Failed to update photo', true)
    }
  }

  const joinedDate = new Date(user.joinedAt).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className={styles.page}>
      {/* topbar */}
      <div className={styles.topbar}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
      </div>

      <div className={styles.content}>
        {/* header card */}
        <div className={styles.headerCard}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span className={styles.avatarEmoji}>👤</span>}
            </div>
            <button
              className={styles.avatarEditBtn}
              title="Change photo"
              onClick={() => avatarInputRef.current?.click()}
            >✎</button>
            <input ref={avatarInputRef} type="file" accept="image/*"
              className={styles.avatarInput} onChange={handleAvatarChange} />
          </div>

          <div className={styles.info}>
            <h2 className={styles.displayName}>{user.name}</h2>
            <p className={styles.handle}>@{user.username}</p>
            {user.bio ? <p className={styles.bio}>{user.bio}</p> : <p className={styles.bioEmpty}>No bio yet.</p>}
            <p className={styles.joined}>Member since {joinedDate}</p>
          </div>

          <button className={styles.editBtn} onClick={() => setEditOpen(true)}>
            Edit Profile
          </button>
        </div>

        {/* stats strip (same as statcell) */}
        <div className={styles.statsStrip}>
          <StatCard value={total} label="Total Logged"/>
          <StatCard value={completed} label="Completed"/>
          <StatCard value={avg} label="Avg Score"/>
          <StatCard value={typeCount} label="Categories"/>
        </div>

        {/* pinned entries will show here as well :3*/}
        {pinned.length > 0 && (
          <>
            <h3 className={styles.sectionTitle}>Pinned ★</h3>
            <div className={styles.pinnedGrid}>
              {pinned.map((entry) => {
                const tm = TYPE_META[entry.type] || { color: 'var(--muted)', emoji: '◌', label: entry.type }
                const sm = STATUS_META[entry.status] || { label: entry.status, color: 'var(--muted)' }
                const displayScore = entry.score ? (entry.score / 2).toFixed(entry.score % 2 === 0 ? 0 : 1) : null

                // tracking progress for albums
                const tracks = Array.isArray(entry.tracks) ? entry.tracks : []
                const trackTotal = tracks.length
                const trackDone = tracks.filter(t => t.checked).length

                // season progress for TV
                const seasons = Array.isArray(entry.seasons) ? entry.seasons : []
                const totalEps = seasons.reduce((a, s) => a + (s.episodeCount    || 0), 0)
                const watchedEps = seasons.reduce((a, s) => a + (s.watchedEpisodes || 0), 0)

                return (
                  <div key={entry.id} className={styles.pinnedCard}>
                    {/* cover */}
                    <div className={styles.pinnedCover}>
                      {entry.image ? <img src={entry.image} alt={entry.title} className={styles.pinnedImg} /> : <div className={styles.pinnedPlaceholder}>{tm.emoji}</div>}
                      <span className={styles.pinnedTypeBadge}
                        style={{ color: tm.color }}>
                        {tm.label}
                      </span>
                    </div>

                    {/* info */}
                    <div className={styles.pinnedBody}>
                      <div className={styles.pinnedTitle}>{entry.title}</div>
                      {entry.year && <div className={styles.pinnedYear}>{entry.year}</div>}
                      {entry.creator && (
                        <div className={styles.pinnedCreator}>{entry.creator}</div>
                      )}

                      {/* progress indicators */}
                      {entry.type === 'album' && trackTotal > 0 && (
                        <div className={styles.pinnedProgressWrap}>
                          <div className={styles.pinnedProgressBar}>
                            <div className={styles.pinnedProgressFill}
                              style={{ width: `${(trackDone / trackTotal) * 100}%` }} />
                          </div>
                          <span className={styles.pinnedProgressLabel}>
                            {trackDone}/{trackTotal} tracks
                          </span>
                        </div>
                      )}
                      {/* accounting for total episodes regardless of seasons */}
                      {entry.type === 'tv' && totalEps > 0 && (
                        <div className={styles.pinnedProgressWrap}>
                          <div className={styles.pinnedProgressBar}>
                            <div className={styles.pinnedProgressFill}
                              style={{ width: `${(watchedEps / totalEps) * 100}%` }} />
                          </div>
                          <span className={styles.pinnedProgressLabel}>
                            {watchedEps}/{totalEps} eps
                          </span>
                        </div>
                      )}
                      {entry.type !== 'album' && entry.type !== 'tv' && entry.progress && (
                        <div className={styles.pinnedProgress}>{entry.progress}</div>
                      )}

                      <div className={styles.pinnedMeta}>
                        <span className={styles.pinnedStatus}>
                          <span className={styles.pinnedStatusDot} style={{ background: sm.color }} />
                          {sm.label}
                        </span>
                        {displayScore && (
                          <span className={styles.pinnedScore}>
                            ★ {displayScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* category breakdown */}
        <h3 className={styles.sectionTitle}>By Category</h3>
        <div className={styles.breakdown}>
          {MEDIA_TYPES.map((type) => {
            const meta  = TYPE_META[type]
            const count = entries.filter((e) => e.type === type).length
            const pct   = Math.round((count / maxCount) * 100)
            return (
              <div key={type} className={styles.breakItem}>
                <span className={styles.breakEmoji}>{meta.emoji}</span>
                <div className={styles.breakInfo}>
                  <div className={styles.breakName}>{meta.label}</div>
                  <div className={styles.breakCount}>{count} {count === 1 ? 'entry' : 'entries'}</div>
                  <div className={styles.breakBarTrack}>
                    <div className={styles.breakBarFill}
                      style={{ width: `${pct}%`, background: meta.color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editOpen && (
        <EditProfileModal
          user={user}
          onSave={handleSaveProfile}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statNum}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
