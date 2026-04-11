import { useState, useEffect, useCallback } from 'react'
import { EntryListView } from './EntryListView'
import { EntryGridView } from './EntryGridView'
import { EntryModal } from './EntryModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PAGE_TITLES, STATUS_FILTER_OPTIONS } from '@/lib/constants'
import styles from './TrackerPage.module.css'

const CARD_SIZE_KEY = 'ilkda-card-size'
const CARD_MIN = 120
const CARD_MAX = 300
const CARD_DEFAULT = 160
const PIN_LIMIT = 5
const PAGE_SIZE = 85

const SORT_OPTIONS = [
  { value: 'updated', label: 'Updated'}, 
  { value: 'added', label: 'Added'}, 
  { value: 'completed', label: 'Completed'}, 
  { value: 'title_az', label: 'Title A-Z'}, 
  { value: 'title_za', label: 'Title Z-A'}, 
  { value: 'rating_51', label: 'Rating (desc)'}, 
  { value: 'rating_15', label: 'Rating (asc)'},   
]

function sortEntries(entries, sortBy) {
  return [...entries].sort((a,b) => {
    // pinned always first
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt) - new Date(a.updatedAd)
      case 'added':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'completed': {
        if (!a.completed_at && !b.completed_at) return 0
        if (!a.completed_at) return 1
        if (!b.completed_at) return -1
        return new Date(b.completed_at) - new Date(a.completed_at)        
      }
      case 'title_az':
        return a.title.localeCompare(b.title)
      case 'title_za':
        return b.title.localeCompare(a.title)      
      case 'rating_51':
        return (b.score ?? 0) - (a.score ?? 0)
      case 'rating_15':
        return (a.score ?? 0) - (b.score ?? 0)
      default:
        return 0
    }
  })
}

export function TrackerPage({
  activeView, entries, loading, load, debouncedLoad, create, update, remove, togglePin, onLightbox, onToast,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayMode, setDisplayMode]  = useState(
    () => localStorage.getItem('ilkda-dm') ?? 'list',
  )
  const [cardSize, setCardSize] = useState(
    () => Number(localStorage.getItem(CARD_SIZE_KEY)) || CARD_DEFAULT,
  )

  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('ilkda-sort') ?? 'updated'
  )

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [modalEntry, setModalEntry] = useState(undefined)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => {
    load({ type: activeView, status: statusFilter})
    setVisibleCount(PAGE_SIZE)
  }, [activeView, statusFilter, load])

  useEffect(() => { setVisibleCount(PAGE_SIZE)} , [sortBy])

  const handleSearch = useCallback((q) => {
    setSearchQuery(q)
    debouncedLoad({ type: activeView, status: statusFilter, query: q })
  }, [activeView, statusFilter, debouncedLoad])

  const handleDisplayMode = (mode) => {
    setDisplayMode(mode)
    localStorage.setItem('ilkda-dm', mode)
  }

  const handleSort = (val) => {
    setSortBy(val)
    localStorage.setItem('ilkda-sort', val)
  }
 
  const handleCardSize = (val) => {
    setCardSize(val)
    localStorage.setItem(CARD_SIZE_KEY, val)
  }

  const handleSave = async (draft) => {
    try {
      if (modalEntry) {
        await update(modalEntry.id, draft)
        onToast('Entry updated')
      } else {
        await create(draft)
        onToast('Entry added')
      }
      setModalEntry(undefined)
    } catch (err) {
      onToast(err.message || 'Failed to save entry', true)
    }
  }

  const requestDelete = (id) => setPendingDeleteId(id)

  const confirmDelete = async () => {
    const id = pendingDeleteId
    setPendingDeleteId(null)
    try {
      await remove(id)
      onToast('Entry removed')
    } catch (err) {
      onToast(err.message || 'Failed to delete entry', true)
    }
  }

  const handlePin = async (id) => {
    try {
      const updated = await togglePin(id)
      onToast(updated.pinned ? 'Entry pinned' : 'Entry unpinned')
    } catch (err) {
      onToast(err.message || 'Failed to update pin', true)
    }
  }

  // pin filter on the client-side
  const pinnedCount  = entries.filter((e) => e.pinned).length
  const filteredEntries = statusFilter === 'pinned' ? entries.filter((e) => e.pinned) : entries
  // sort handles pinned-first internally
  const sortedEntries = sortEntries(filteredEntries, sortBy)
  const displayEntries = sortedEntries.slice(0, visibleCount)
  const hasMore = visibleCount < sortedEntries.length
 
  const pendingEntry = pendingDeleteId ? entries.find((e) => e.id === pendingDeleteId) : null

  // all filter tabs - status options + pinned tab
  const allFilterTabs = [
    ...STATUS_FILTER_OPTIONS,
    { value: 'pinned', label: `★ Pinned${pinnedCount ? ` (${pinnedCount})` : ''}` },
  ]

  // Source - https://stackoverflow.com/a/33156438
  // Posted by GolezTrol, modified by community. See post 'Timeline' for change history
  // Retrieved 2026-04-08, License - CC BY-SA 3.0

  // window.addEventListener('DOMContentLoaded', function() {
  //   document.getElementById('sortSelect').addEventListener('mouseover', function(event) {
  //     document.getElementById('sortSelect').classList.add('activated');
  //   });
  // });

  return (
    <div className={styles.page}>
      {/* top bar */}
      <div className={styles.topbar}>
        <h1 className={styles.pageTitle}>{PAGE_TITLES[activeView] ?? activeView}</h1>

        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="text" className={styles.searchInput} placeholder="search…"
            value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          {allFilterTabs.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.filterTab} ${statusFilter === value ? styles.filterTabActive : ''} ${value === 'pinned' ? styles.filterTabPinned : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.ascWrapper}>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <button className={styles.addBtn} onClick={() => setModalEntry(null)}>
            + Add Entry
          </button>

          {displayMode === 'grid' && (
            <div className={styles.sizeSliderWrap} title="Card size">
              <svg className={styles.sizeIcon} width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="0" y="0" width="4" height="4" rx="0.8" fill="currentColor" opacity="0.5"/>
                <rect x="5.5" y="0" width="5.5" height="5.5" rx="0.8" fill="currentColor"/>
              </svg>
              <input
                type="range" className={styles.sizeSlider}
                min={CARD_MIN} max={CARD_MAX} value={cardSize}
                onChange={(e) => handleCardSize(Number(e.target.value))}
              />
            </div>
          )}

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${displayMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => handleDisplayMode('list')} title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="1"  width="14" height="2" rx="1" fill="currentColor" />
                <rect x="0" y="6"  width="14" height="2" rx="1" fill="currentColor" />
                <rect x="0" y="11" width="14" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              className={`${styles.viewBtn} ${displayMode === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => handleDisplayMode('grid')} title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="0" width="6" height="6" rx="1.5" fill="currentColor" />
                <rect x="8" y="0" width="6" height="6" rx="1.5" fill="currentColor" />
                <rect x="0" y="8" width="6" height="6" rx="1.5" fill="currentColor" />
                <rect x="8" y="8" width="6" height="6" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
        </div>



      {/* content */}
      <div className={styles.contentWrap}>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}><div className={styles.spinner} />Loading…</div>
          )}

          {!loading && displayEntries.length === 0 && (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>{statusFilter === 'pinned' ? '★' : '◌'}</span>
              <span className={styles.emptyTitle}>
                {statusFilter === 'pinned' ? 'No pinned entries' : 'Nothing here yet'}
              </span>
              <span className={styles.emptySub}>
                {statusFilter === 'pinned' ? `Pin up to ${PIN_LIMIT} entries using the ★ button` : 'Add your first entry to get started'}
              </span>
            </div>
          )}

          {!loading && displayEntries.length > 0 && displayMode === 'list' && (
            <EntryListView
              entries={displayEntries}
              onEdit={setModalEntry}
              onDelete={requestDelete}
              onPin={handlePin}
              pinnedCount={pinnedCount}
              pinLimit={PIN_LIMIT}
              onLightbox={onLightbox}
            />
          )}

          {!loading && displayEntries.length > 0 && displayMode === 'grid' && (
            <EntryGridView
              entries={displayEntries}
              onEdit={setModalEntry}
              onDelete={requestDelete}
              onPin={handlePin}
              pinnedCount={pinnedCount}
              pinLimit={PIN_LIMIT}
              cardSize={cardSize}
            />
          )}

          {!loading && hasMore && (
            <div className={styles.loadMoreWrap}>
              <button className={styles.loadMoreBtn}
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Load more
                <span className={styles.loadMoreCount}>
                  {sortedEntries.length - visibleCount} remaining
                </span>
              </button>
            </div>
          )}
       
        </div>

      </div>

      {modalEntry !== undefined && (
        <EntryModal
          entry={modalEntry}
          onSave={handleSave}
          onClose={() => setModalEntry(undefined)}
          onLightbox={onLightbox}
        />
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          message={
            pendingEntry ? `Delete "${pendingEntry.title}"? This can't be undone.` : "Delete this entry? This can't be undone."
          }
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
