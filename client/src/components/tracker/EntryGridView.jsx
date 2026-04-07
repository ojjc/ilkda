import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { TYPE_META, STATUS_META } from '@/lib/constants'
import styles from './EntryGridView.module.css'

function NotesBubble({ notes, anchorRect, dir }) {
  if (!anchorRect) return null

  const BUBBLE_WIDTH = 220
  const GAP = 8 

  let style
  if (dir === 'right') {
    style = {
      top: anchorRect.top + window.scrollY,
      left: anchorRect.right + GAP,
    }
  } else {
    style = {
      top: anchorRect.top + window.scrollY,
      left: anchorRect.left - BUBBLE_WIDTH - GAP,
    }
  }

  return createPortal(
    <div
      className={`${styles.notesBubble} ${dir === 'right' ? styles.notesBubbleRight : styles.notesBubbleLeft}`}
      style={{ position: 'absolute', width: BUBBLE_WIDTH, ...style }}
    >
      <div className={styles.notesBubbleTail} />
      <p className={styles.notesBubbleText}>{notes}</p>
    </div>,
    document.body
  )
}

export function EntryGridView({ entries, onEdit, onDelete, onPin, pinnedCount, pinLimit, cardSize = 160 }) {
  const [openNote, setOpenNote] = useState(null) 
  const btnRefs = useRef({})

  // close bubble on outside click
  useEffect(() => {
    if (!openNote) return
    const handler = (e) => {
      if (!e.target.closest(`.${styles.notesBubble}`) && !e.target.closest(`.${styles.overlayBtnNotes}`)) {
        setOpenNote(null)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [openNote])

  // reposition on scroll/resize while open
  useEffect(() => {
    if (!openNote) return
    const update = () => {
      const btn = btnRefs.current[openNote.id]
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      setOpenNote(prev => ({ ...prev, anchorRect: rect }))
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [openNote?.id])

  const handleNotesToggle = useCallback((e, entry) => {
    e.stopPropagation()
    if (openNote?.id === entry.id) {
      setOpenNote(null)
      return
    }
    const btn = btnRefs.current[entry.id]
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    // handling rightward or leftward opening based on grid position
    const dir = rect.left > window.innerWidth - rect.right ? 'left' : 'right'
    setOpenNote({ id: entry.id, anchorRect: rect, dir, notes: entry.notes })
  }, [openNote])

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(auto-fill, ${cardSize}px)`,
        '--card-size': cardSize,
        // '--bubble-size': BUBBLE_WIDTH,
      }}
    >
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

        const noteOpen = openNote?.id === entry.id
        const hasNotes = entry.notes && entry.notes.trim().length > 0

        return (
          <div
            key={entry.id}
            className={`${styles.card} ${entry.pinned ? styles.cardPinned : ''}`}
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            onClick={() => onEdit(entry)}
          >
            {entry.image
              ? <img className={styles.cover} src={entry.image} alt={entry.title} />
              : <div className={styles.coverPlaceholder}>{tm.emoji}</div>
            }

            <span
              className={styles.typeBadge}
              style={{ color: tm.color }}
              // style={{ background: `${tm.color}33`, color: tm.color }}
            >
              {tm.label}
            </span>

            {entry.pinned && (
              <span className={styles.pinnedBadge} title="Pinned">★</span>
            )}

            <div className={styles.overlayBtns} onClick={(e) => e.stopPropagation()}>
              <button
                className={`${styles.overlayBtnPin} ${entry.pinned ? styles.overlayBtnPinned : ''} ${!canPin ? styles.overlayBtnDisabled : ''}`}
                onClick={() => canPin && onPin(entry.id)}
                title={entry.pinned ? 'Unpin' : canPin ? 'Pin' : `Pin limit (${pinLimit}) reached`}
                disabled={!canPin}
              >
                ★
              </button>
              <button
                className={`${styles.overlayBtn} ${styles.overlayBtnDelete}`}
                onClick={() => onDelete(entry.id)}
                title="Delete"
              >
                ✕
              </button>
              {hasNotes && (
                <button
                  ref={el => { if (el) btnRefs.current[entry.id] = el }}
                  className={`${styles.overlayBtnNote} ${styles.overlayBtnNotes} ${noteOpen ? styles.overlayBtnNotesActive : ''}`}
                  onClick={(e) => handleNotesToggle(e, entry)}
                  title="Review"
                >
                  ✎
                </button>
              )}
            </div>

            <div className={styles.body}>
              <div className={styles.cardTitle}>{entry.title}</div>

              {entry.year && <div className={styles.yearBadge}>{entry.year}</div>}

              {showTrackBar ? (
                <div className={styles.trackBarWrap}>
                  <div className={styles.trackBar}>
                    <div className={styles.trackBarFill} style={{ width: `${trackPct}%` }} />
                  </div>
                  <span className={styles.trackLabel}>{trackChecked}/{trackTotal}</span>
                </div>
              ) : (
                entry.progress && <div className={styles.progress}>{entry.progress}</div>
              )}
            </div>
            
            <div className={styles.meta}>
              <div className={styles.status}>
                <span className={styles.statusDot} style={{ background: sm.color }} />
                {sm.label}
              </div>
              {displayScore
                ? <span className={styles.score}>★ {displayScore}</span>
                : <span className={styles.scoreDash}>—</span>
              }
            </div>

          </div>
        )
      })}

      {/* "portal" bubble is a really funny way of saying that it is NOW immune to any parent clipping */}
      {openNote && (
        <NotesBubble
          notes={openNote.notes}
          anchorRect={openNote.anchorRect}
          dir={openNote.dir}
        />
      )}
    </div>
  )
}