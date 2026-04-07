import { TYPE_META, STATUS_META } from '@/lib/constants'
import styles from './EntryListView.module.css'

/**
 * @param {{
 *   entries: object[],
 *   onEdit: (e: object) => void,
 *   onDelete: (id: string) => void,
 *   onPin: (id: string) => void,
 *   pinnedCount: number,
 *   pinLimit: number,
 *   onLightbox: (src: string) => void,
 * }} props
 */
export function EntryListView({ entries, onEdit, onDelete, onPin, pinnedCount, pinLimit, onLightbox }) {
  return (
    <div>
      <div className={styles.header}>
        <div />
        <div>Title</div>
        <div>Status</div>
        <div>Year</div>
        <div>Progress</div>
        <div>Score</div>
        <div>Review</div>
        <div />
      </div>

      {entries.map((entry, i) => {
        const tm = TYPE_META[entry.type] || { label: entry.type, color: 'var(--muted)', emoji: '◌' }
        const sm = STATUS_META[entry.status] || { label: entry.status, color: 'var(--muted)' }
        const displayScore = entry.score ? (entry.score / 2).toFixed(entry.score % 2 === 0 ? 0 : 1) : null
        const canPin = entry.pinned || pinnedCount < pinLimit

        const tracks = Array.isArray(entry.tracks) ? entry.tracks : []
        const trackTotal = tracks.length
        const trackChecked = tracks.filter(t => t.checked).length
        const trackPct = trackTotal > 0 ? (trackChecked / trackTotal) * 100 : 0
        const showTrackBar = entry.type === 'album' && trackTotal > 0

        return (
          <div
            key={entry.id}
            className={`${styles.row} ${entry.pinned ? styles.rowPinned : ''}`}
            style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
            onClick={() => onEdit(entry)}
          >
            {/* thumbnail */}
            {entry.image ? (
              <img
                className={styles.thumb}
                src={entry.image}
                alt=""
                onClick={(e) => { e.stopPropagation(); onLightbox(entry.image) }}
              />
            ) : (
              <div className={styles.thumbPlaceholder}>{tm.emoji}</div>
            )}

            {/* title + type desc */}
            <div className={styles.titleCol}>
              {entry.pinned && <span className={styles.pinBadge} title="Pinned">★</span>}
              <span className={styles.typePill} style={{ background: `${tm.color}22`, color: tm.color }}>
                {tm.label}
              </span>
              <span className={styles.titleText} title={entry.title}>{entry.title}</span>
            </div>

            {/* status */}
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} style={{ background: sm.color }} />
              {sm.label}
            </div>

            {/* year */}
            <div className={styles.yearText}>{entry.year ?? '—'}</div>

            {/* progress / track bar */}
            {showTrackBar ? (
              <div className={styles.trackBarWrap}>
                <div className={styles.trackBar}>
                  <div className={styles.trackBarFill} style={{ width: `${trackPct}%` }} />
                </div>
                <span className={styles.trackLabel}>{trackChecked}/{trackTotal}</span>
              </div>
            ) : (
              <div className={styles.progressText}>{entry.progress || '—'}</div>
            )}

            {/* score */}
            <div className={styles.scoreCol}>
              {displayScore
                ? <><span className={styles.scoreNum}>★ {displayScore}</span></>
                : <span className={styles.scoreDash}>—</span>
              }
            </div>

            {/* review */}
            <div className={styles.notesCol}>
              <span className={styles.review}>{entry.notes}</span>
            </div>

            {/* actions */}
            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
              <button
                className={`${styles.pinBtn} ${entry.pinned ? styles.pinBtnActive : ''} ${!canPin ? styles.pinBtnDisabled : ''}`}
                onClick={() => canPin && onPin(entry.id)}
                title={entry.pinned ? 'Unpin' : canPin ? 'Pin' : `Pin limit (${pinLimit}) reached`}
                disabled={!canPin}
              >
                ★
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => onDelete(entry.id)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
