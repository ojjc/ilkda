import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { StarRating } from '@/components/ui/StarRating'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MediaSearch } from '@/components/ui/MediaSearch'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMediaSearch } from '@/hooks/useMediaSearch'
import { imageApi, spotifyApi } from '@/lib/api'
import { TYPE_META, MEDIA_TYPES, ENTRY_STATUSES, STATUS_META } from '@/lib/constants'
import styles from './EntryModal.module.css'

const SEARCH_TYPES = new Set(['movie', 'tv', 'anime', 'manga', 'book', 'album'])
const CURRENT_YEAR = new Date().getFullYear()
// const CURRENT_DATE = new Date().toLocaleDateString()

// more constitent for database layout than ^
function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function rewatchTerm(type) {
  if (type === 'manga' || type === 'book') return 'Reread'
  if (type === 'game') return 'Replay' //replay replay replayyy
  if (type === 'album') return 'Relisten'
  return 'Rewatch' // anime, tv, movie
}

function creatorLabel(type) {
  if (type === 'manga' || type === 'book') return 'Author'
  if (type === 'anime') return 'Studio'
  if (type === 'tv') return 'Network'
  if (type === 'movie') return 'Director'
  if (type === 'album') return 'Artist'
  return null
}

function fmtDuration(ms) {
  if (!ms) return ''
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

const SEASON_STATUSES = ['planning', 'in-progress', 'completed', 'on-hold', 'dropped']

// build a "completed" progress string for each type
function completedProgress(type, { pages, tracks, seasons, progress }) {
  if (type === 'album') return null  // this is done by track checklist, so unnecessary
  if (type === 'movie') return null  // movies have no progress, it's just if you watched it or not

  if (type === 'tv') {
    if (seasons && seasons.length > 0) return null  // seasons handle their own state
    // try to parse existing progress like "0 / 24 eps" -> "24 / 24 eps"
    const m = (progress || '').match(/\d+\s*\/\s*(\d+)\s*(.*)?/)
    if (m) return `${m[1]} / ${m[1]}${m[2] ? ' ' + m[2].trim() : ' eps'}`
    return null
  }
  if (type === 'book') {
    if (pages) return `p. ${pages} / ${pages}`
    const m = (progress || '').match(/\d+\s*\/\s*(\d+)\s*(.*)?/)
    if (m) return `p. ${m[1]} / ${m[1]}`
    return null
  }
  // anime, manga, game
  const m = (progress || '').match(/\d+\s*\/\s*(\d+)\s*(.*)?/)
  if (m) return `${m[1]} / ${m[1]}${m[2] ? ' ' + m[2].trim() : ''}`
  return null
}

// season list
function SeasonList({ seasons, onChange }) {
  const [expanded, setExpanded] = useState(null)

  const update = (idx, patch) => onChange(seasons.map((s, i) => i === idx ? { ...s, ...patch } : s))

  const totalEps = seasons.reduce((a, s) => a + (s.episodeCount || 0), 0)
  const watchedEps = seasons.reduce((a, s) => a + (s.watchedEpisodes || 0), 0)
  const pct = totalEps > 0 ? Math.round((watchedEps / totalEps) * 100) : 0

  if (seasons.length === 0) {
    return <div className={styles.tracksEmpty}>Search for and select a TV show above to load its seasons.</div>
  }

  return (
    <div className={styles.trackList}>
      <div className={styles.seasonSummaryBar}>
        <div className={styles.trackProgressBar} style={{ flex: 1 }}>
          <div className={styles.trackProgressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.seasonSummaryLabel}>{watchedEps} / {totalEps} eps · {pct}%</span>
      </div>

      {seasons.map((season, idx) => {
        const sm = STATUS_META[season.status] || STATUS_META['planning']
        const isOpen = expanded === idx
        const epPct = season.episodeCount > 0 ? Math.round((season.watchedEpisodes / season.episodeCount) * 100) : 0

        return (
          <div key={idx} className={styles.seasonItem}>
            <button type="button" className={styles.seasonHeader}
              onClick={() => setExpanded(isOpen ? null : idx)}>
              <span className={styles.seasonNum}>S{season.number}</span>
              <span className={styles.seasonName}>{season.name}</span>
              <span className={styles.seasonEps}>{season.watchedEpisodes}/{season.episodeCount} eps</span>
              <span className={styles.seasonStatusDot} style={{ background: sm.color }} />
              <span className={styles.seasonChevron}>{isOpen ? '▲' : '▼'}</span>
            </button>
            <div className={styles.seasonMiniBar}>
              <div className={styles.seasonMiniBarFill} style={{ width: `${epPct}%` }} />
            </div>
            {isOpen && (
              <div className={styles.seasonControls}>
                <div className={styles.seasonRow}>
                  <div className={styles.seasonField}>
                    <label className={styles.seasonFieldLabel}>Watched Episodes</label>
                    <input className={styles.seasonInput} type="number" min="0" max={season.episodeCount}
                      value={season.watchedEpisodes}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(season.episodeCount, Number(e.target.value) || 0))
                        const autoStatus = v === season.episodeCount && v > 0 ? 'completed' : v > 0 ? 'in-progress' : season.status
                        update(idx, { watchedEpisodes: v, status: autoStatus })
                      }} />
                  </div>
                  <div className={styles.seasonField}>
                    <label className={styles.seasonFieldLabel}>Status</label>
                    <select className={styles.seasonInput} value={season.status}
                      onChange={(e) => update(idx, { status: e.target.value })}>
                      {SEASON_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.seasonField}>
                    <label className={styles.seasonFieldLabel}>Score (0–5)</label>
                    <input className={styles.seasonInput} type="number" min="0" max="5" step="0.5"
                      placeholder="—"
                      value={season.score > 0 ? (season.score / 2).toFixed(season.score % 2 === 0 ? 0 : 1) : ''}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(5, Number(e.target.value) || 0))
                        update(idx, { score: Math.round(v * 2) })
                      }} />
                  </div>
                </div>
                <div className={styles.seasonField}>
                  <label className={styles.seasonFieldLabel}>Season Notes</label>
                  <input className={styles.seasonInput} type="text"
                    placeholder="Optional notes for this season…"
                    value={season.notes}
                    onChange={(e) => update(idx, { notes: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// main modal
export function EntryModal({ entry, onSave, onClose, onLightbox }) {
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('in-progress')
  const [progress, setProgress] = useState('')
  const [score, setScore] = useState(0)
  const [year, setYear] = useState('')
  const [date, setDate] = useState('')
  const [creator, setCreator] = useState('')
  const [isbn, setIsbn] = useState('')
  const [pages, setPages] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [tracks, setTracks] = useState([])
  const [seasons, setSeasons] = useState([])
  const [completedAt, setCompletedAt] = useState('')
  const [rewatches, setRewatches] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error,  setError] = useState('')

  const img = useImageUpload()
  const search = useMediaSearch()

  const isSearchType = SEARCH_TYPES.has(type)
  const isBook = type === 'book'
  const isAlbum = type === 'album'
  const isTV = type === 'tv'
  const isMovie = type === 'movie'
  const creatorLbl = creatorLabel(type)

  const checkedCount = tracks.filter(t => t.checked).length
  const totalTracks = tracks.length
  const totalSeasonEps = seasons.reduce((a, s) => a + (s.episodeCount || 0), 0)
  const watchedSeasonEps = seasons.reduce((a, s) => a + (s.watchedEpisodes || 0), 0)
  const hasSeasons = isTV && seasons.length > 0

  // populate when editing
  useEffect(() => {
    if (entry) {
      setType(entry.type)
      setTitle(entry.title)
      setStatus(entry.status)
      setProgress(entry.progress)
      setScore(entry.score)
      setYear(entry.year != null ? String(entry.year) : '')
      setDate(entry.date != null ? String(entry.date) : '')
      setCreator(entry.creator || '')
      setIsbn(entry.isbn || '')
      setPages(entry.pages != null ? String(entry.pages) : '')
      setDescription(entry.description || '')
      setNotes(entry.notes)
      setTracks(Array.isArray(entry.tracks) ? entry.tracks   : [])
      setSeasons(Array.isArray(entry.seasons) ? entry.seasons  : [])
      setCompletedAt(entry.completed_at ? entry.completed_at.split('T')[0] : '')
      setRewatches(Array.isArray(entry.rewatches) ? entry.rewatches : [])
      img.setExisting(entry.image)
      if (SEARCH_TYPES.has(entry.type)) search.prefill(entry.title)
      else search.clear()
    } else {
      setType(''); setTitle(''); setStatus('in-progress'); setProgress(''); setScore(0); setYear(''); setDate(''); setCreator(''); setIsbn(''); setPages('')
      setDescription(''); setNotes(''); setTracks([]); setSeasons([]); setCompletedAt(''); setRewatches([]); img.reset(); search.clear()
    }
  }, [entry])

  // status change: auto-fill progress when set to "Completed"
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    if (newStatus === 'completed' && !completedAt) {
      setCompletedAt(todayISO())
    }
    if (newStatus !== 'completed') return

    // albums - check all tracks
    if (isAlbum && totalTracks > 0) {
      setTracks(prev => prev.map(t => ({ ...t, checked: true })))
      return
    }
    // tv with seasons - fill all episodes
    if (isTV && seasons.length > 0) {
      setSeasons(prev => prev.map(s => ({
        ...s,
        watchedEpisodes: s.episodeCount,
        status: 'completed',
      })))
      return
    }
    // everything else - derive from existing progress pattern or pages
    const filled = completedProgress(type, { pages, seasons, progress })
    if (filled) setProgress(filled)
  }

  const handleTypeChange = (t) => {
    setType(t); search.clear()
    if (t !== 'album') setTracks([])
    if (t !== 'tv')    setSeasons([])
  }

  // selecting media result
  const handlePick = async (result) => {
    setTitle(result.title)
    search.pick(result)

    if (result.year) setYear(String(result.year))
    if (result.creator) setCreator(result.creator)
    if (result.overview) setDescription(result.overview)
    setNotes('')

    if (result.isbn) setIsbn(result.isbn)
    if (result.pages) setPages(String(result.pages))

    if (type === 'tv' && Array.isArray(result.seasons) && result.seasons.length > 0) {
      setSeasons(result.seasons); setProgress('')
    } else if (!isAlbum) {
      if (result.episodes) setProgress(`0 / ${result.episodes} eps`)
      else if (result.chapters) setProgress(`0 / ${result.chapters} ch`)
      else if (result.volumes) setProgress(`0 / ${result.volumes} vol`)
      else if (result.pages) setProgress(`p. 0 / ${result.pages}`)
      else setProgress('')
    } else {
      setProgress('')
    }

    if (result.posterUrl) {
      try { 
        img.setExisting(await imageApi.fetchPoster(result.posterUrl)) 
      } catch (e) { 
        console.error("image fetching error", e)
      }
    }

    if (type === 'album' && result.id) {
      setTracks([]); setLoadingTracks(true)
      try {
        const data = await spotifyApi.getTracks(result.id)
        setTracks(data.tracks.map(t => ({ ...t, checked: false })))
      } catch (e) { 
        console.error("album selection error", e)
      }
      finally { setLoadingTracks(false) }
    }
  }

  const toggleTrack = useCallback((id) =>
    setTracks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t)), [])
  const toggleAllTracks = useCallback(() => {
    const all = tracks.every(t => t.checked)
    setTracks(prev => prev.map(t => ({ ...t, checked: !all })))
  }, [tracks])

  // saving
  const handleSave = async () => {
    // title bug where it would clear out, fixed
    const finalTitle = isSearchType
      ? (search.query.trim() || title.trim()) : title.trim()

    if (!finalTitle) { setError('Please enter a title.'); return }
    if (!type) { setError('Please select a media type.'); return }

    const parsedYear = year.trim() ? Number(year.trim()) : null
    const parsedPages = pages.trim() ? Number(pages.trim()) : null

    if (parsedYear !== null && (parsedYear < 1800 || parsedYear > CURRENT_YEAR + 5)) {
      setError('Please enter a valid year.'); return
    }

    const finalTracks = isAlbum ? tracks : []
    const finalSeasons = isTV ? seasons : []
    let finalStatus = status
    let finalCompletedAt = completedAt || null

    // detecting auto-completed actions
    if (isAlbum && totalTracks > 0 && checkedCount === totalTracks) {
      finalStatus = 'completed'
    } else if (isTV && hasSeasons && totalSeasonEps > 0 && watchedSeasonEps === totalSeasonEps) {
      finalStatus = 'completed'
    } else if (!isAlbum && !hasSeasons) {
      const m = progress.trim().match(/(\d+)\s*\/\s*(\d+)/)
      if (m && m[1] === m[2] && Number(m[1]) > 0) finalStatus = 'completed'
    }

    // auto-set completedAt if we just detected completion and it wasn't set
    if (finalStatus === 'completed' && !finalCompletedAt) {
      finalCompletedAt = todayISO()
    }

    const finalProgress = hasSeasons ? `${watchedSeasonEps} / ${totalSeasonEps} eps` : progress

    setError(''); setSaving(true)
    try {
      await onSave({
        type, title: finalTitle, status: finalStatus,
        progress: finalProgress, score, year: parsedYear, creator,
        isbn: isbn.trim() || null, pages: parsedPages,
        description, notes, image: img.preview,
        tracks: finalTracks, seasons: finalSeasons,
        completed_at: finalCompletedAt,
        rewatches,
      })
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  const showProgress = !isMovie && !isAlbum

  return (
    <Modal
      title={entry ? 'Edit Entry' : 'New Entry'}
      onClose={onClose}
      panelClassName={styles.panel}
      footer={
        <>
          <button className={styles.btnSecondary} onClick={onClose} type="button">Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </>
      }
    >
      {/* type picker */}
      <div className={styles.field}>
        <label className={styles.label}>Media Type</label>
        <div className={styles.typeGrid}>
          {MEDIA_TYPES.map((t) => {
            const meta = TYPE_META[t]
            return (
              <button key={t} type="button"
                className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
                onClick={() => handleTypeChange(t)}>
                <span className={styles.typeEmoji}>{meta.emoji}</span>
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* two col body */}
      <div className={styles.twoCol}>

        {/* left - img */}
        <div className={styles.leftCol}>

          <div className={styles.field}>
            <label className={styles.label}>Cover Image</label>
            <ImageUpload
              preview={img.preview} dragging={img.dragging}
              onDragOver={img.handleDragOver} onDragLeave={img.handleDragLeave}
              onDrop={img.handleDrop} onInputChange={img.handleInputChange}
              onRemove={img.reset} onLightbox={onLightbox} />
          </div>
        </div>

        {/* right */}
        <div className={styles.rightCol}>

          {/* title */}
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            {isSearchType ? (
              <MediaSearch type={type} query={search.query} results={search.results}
                searching={search.searching} error={search.error} source={search.source}
                onChange={(val) => search.setQuery(val, type)} onPick={handlePick} />
            ) : (
              <input className={styles.input} type="text" placeholder="Enter title…"
                value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            )}
          </div>

          {/* status + progress + year */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="em-status">Status</label>
            <select id="em-status" className={styles.input} value={status}
              onChange={(e) => handleStatusChange(e.target.value)}>
              {ENTRY_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
              ))}
            </select>
          </div>

          {showProgress && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="em-progress">Progress</label>
              <input id="em-progress" className={styles.input} type="text"
                placeholder={isBook ? 'e.g. p. 120 / 350' : 'e.g. ep 12 / ch 45'}
                value={hasSeasons ? `${watchedSeasonEps} / ${totalSeasonEps} eps` : progress}
                readOnly={hasSeasons}
                onChange={(e) => !hasSeasons && setProgress(e.target.value)}
                style={hasSeasons ? { opacity: 0.6, cursor: 'default' } : {}} />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="em-year">Year</label>
            <input id="em-year" className={styles.input} type="number"
              placeholder={String(CURRENT_YEAR)} min="1800" max={CURRENT_YEAR + 5}
              value={year} onChange={(e) => setYear(e.target.value)} />
          </div>

          {creatorLbl && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="em-creator">{creatorLbl}</label>
              <input id="em-creator" className={styles.input} type="text"
                placeholder={
                  type === 'book' ? 'e.g. Frank Herbert' :
                  type === 'manga' ? 'e.g. Eiichiro Oda' :
                  type === 'movie' ? 'e.g. Christopher Nolan' :
                  type === 'tv' ? 'e.g. HBO' :
                  type === 'album' ? 'e.g. Radiohead' : 'e.g. MAPPA'
                }
                value={creator} onChange={(e) => setCreator(e.target.value)} />
            </div>
          )}

          {isBook && (
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="em-isbn">ISBN</label>
                <input id="em-isbn" className={styles.input} type="text"
                  placeholder="e.g. 9780441013593"
                  value={isbn} onChange={(e) => setIsbn(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="em-pages">Pages</label>
                <input id="em-pages" className={styles.input} type="number"
                  placeholder="e.g. 412" min="1"
                  value={pages} onChange={(e) => setPages(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* season list */}
      {isTV && (
        <div className={styles.field}>
          <div className={styles.trackHeader}>
            <label className={styles.label}>
              Seasons
              {seasons.length > 0 && (
                <span className={styles.trackCount}>
                  {seasons.filter(s => s.status === 'completed').length} / {seasons.length} completed
                </span>
              )}
            </label>
          </div>
          <SeasonList seasons={seasons} onChange={setSeasons} />
        </div>
      )}

      {/* track checklist */}
      {isAlbum && (
        <div className={styles.field}>
          <div className={styles.trackHeader}>
            <label className={styles.label}>
              Tracks
              {totalTracks > 0 && (
                <span className={styles.trackCount}>{checkedCount} / {totalTracks} listened</span>
              )}
            </label>
            {totalTracks > 0 && (
              <button type="button" className={styles.toggleAllBtn} onClick={toggleAllTracks}>
                {tracks.every(t => t.checked) ? 'Uncheck all' : 'Check all'}
              </button>
            )}
          </div>
          {loadingTracks && (
            <div className={styles.tracksLoading}>
              <span className={styles.tracksSpinner} />Loading tracks…
            </div>
          )}
          {!loadingTracks && totalTracks === 0 && (
            <div className={styles.tracksEmpty}>Search for and select an album above to load its tracks.</div>
          )}
          {!loadingTracks && totalTracks > 0 && (
            <div className={styles.trackList}>
              <div className={styles.trackProgressBar}>
                <div className={styles.trackProgressFill}
                  style={{ width: `${(checkedCount / totalTracks) * 100}%` }} />
              </div>
              <div className={styles.trackGrid}>
                {tracks.map((track) => (
                  <label key={track.id} className={styles.trackRow}>
                    <input type="checkbox" className={styles.trackCheckbox}
                      checked={track.checked} onChange={() => toggleTrack(track.id)} />
                    <span className={styles.trackNum}>{track.trackNumber}</span>
                    <span className={`${styles.trackName} ${track.checked ? styles.trackChecked : ''}`}>
                      {track.name}
                    </span>
                    {track.durationMs > 0 && (
                      <span className={styles.trackDuration}>{fmtDuration(track.durationMs)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isAlbum &&(
        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea className={`${styles.input} ${styles.textarea} ${styles.textareaDesc}`}
            placeholder="Synopsis or description…" value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>            
      )}

      {status === 'completed' && (
        <div className={styles.completionRow}>
          <div className={styles.field}>
            <label className={styles.label}>Completed On</label>
            <input className={styles.input} type="date"
              value={completedAt}
              onChange={(e) => setCompletedAt(e.target.value)} />
          </div>
          {type && (
            <div className={styles.field}>
              <div className={styles.rewatchHeader}>
                <label className={styles.label}>
                  {rewatchTerm(type)} Log
                  {rewatches.length > 0 && (
                    <span className={styles.trackCount}>{rewatches.length}×</span>
                  )}
                </label>
                <button type="button" className={styles.toggleAllBtn}
                  onClick={() => setRewatches(prev => [...prev, { date: todayISO() }])}>
                  + Add {rewatchTerm(type)}
                </button>
              </div>
              {rewatches.length > 0 && (
                <div className={styles.rewatchList}>
                  {rewatches.map((r, i) => (
                    <div key={i} className={styles.rewatchRow}>
                      <span className={styles.rewatchIndex}>{i + 1}</span>
                      <input className={styles.rewatchDate} type="date"
                        value={r.date}
                        onChange={(e) => setRewatches(prev =>
                          prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x)
                        )} />
                      <button type="button" className={styles.rewatchRemove}
                        onClick={() => setRewatches(prev => prev.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Score (0–5)</label>
        <StarRating value={score} onChange={setScore} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Review</label>
          <textarea className={`${styles.input} ${styles.textarea}`}
          placeholder="your personal review :3" value={notes}
          onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </Modal>
  )
}