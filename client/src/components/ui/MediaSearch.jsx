import { useRef, useEffect } from 'react'
import styles from './MediaSearch.module.css'

const SOURCE_META = {
  tmdb: { label: 'TMDB', color: '#01d277' },
  anilist: { label: 'AniList', color: '#02a9ff' },
  openlibrary: { label: 'OpenLibrary', color: '#e8954a' },
  spotify: { label: 'Spotify', color: '#1db954' },
}

const ANILIST_TYPES = new Set(['anime', 'manga'])
const TMDB_TYPES = new Set(['movie', 'tv'])
const OL_TYPES = new Set(['book'])
const SPOTIFY_TYPES = new Set(['album'])

/**
 * @param {{
 *   type: string,
 *   query: string,
 *   results: object[],
 *   searching: boolean,
 *   error: string | null,
 *   source: 'tmdb' | 'anilist' | 'openlibrary' | null,
 *   onChange: (value: string) => void,
 *   onPick: (result: object) => void,
 * }} props
 */
export function MediaSearch({ type, query, results, searching, error, source, onChange, onPick }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {}
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // getting placeholder directly from entry type
  const placeholder = ANILIST_TYPES.has(type) ? 'Search AniList…'
    : TMDB_TYPES.has(type) ? 'Search TMDB…'
    : OL_TYPES.has(type) ? 'Search OpenLibrary…'
    : SPOTIFY_TYPES.has(type) ? 'Search Spotify…'
    : 'Search…'

  const showDropdown = results.length > 0 || searching || !!error
  const sourceMeta = source ? SOURCE_META[source] : null

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <div className={styles.inputRight}>
          {searching && <span className={styles.spinner} />}
          {sourceMeta && !searching && (
            <span
              className={styles.sourceBadge}
              style={{ color: sourceMeta.color, borderColor: `${sourceMeta.color}44` }}
            >
              {sourceMeta.label}
            </span>
          )}
        </div>
      </div>

      {showDropdown && (
        <div className={styles.dropdown}>
          {error && <div className={styles.errorRow}>{error}</div>}
          {!error && searching && results.length === 0 && (
            <div className={styles.hintRow}>Searching…</div>
          )}
          {!error && results.map((result) => (
            <button
              key={result.id}
              type="button"
              className={styles.result}
              onClick={() => onPick(result)}
            >
              {result.posterUrl
                ? <img className={styles.poster} src={result.posterUrl} alt={result.title} loading="lazy" />
                : <div className={styles.posterPlaceholder}>📚</div>
              }
              <div className={styles.info}>
                <span className={styles.resultTitle}>{result.title}</span>
                {/* alt titles for anime/manga + romanji*/}
                {result.titleRomaji && result.titleRomaji !== result.title && (
                  <span className={styles.titleJp}>{result.titleRomaji}</span>
                )}
                <span className={styles.resultMeta}>
                  {result.year && <span>{result.year}</span>}
                  {result.creator && <span>{result.creator}</span>}
                  {result.episodes != null && <span>{result.episodes} eps</span>}
                  {result.chapters != null && result.chapters && <span>{result.chapters} ch</span>}
                  {result.volumes != null && result.volumes && <span>{result.volumes} vol</span>}
                  {result.pages != null && result.pages && <span>{result.pages} pages</span>}
                  {result.isbn && <span>ISBN {result.isbn}</span>}
                  {result.totalTracks != null && <span>{result.totalTracks} tracks</span>}
                  {result.seasons != null && result.seasons.length > 0 && <span>{result.seasons.length} seasons</span>}
                  {result.rating > 0 && <span>★ {result.rating}</span>}
                </span>
                {result.overview && (
                  <span className={styles.overview}>{result.overview}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
