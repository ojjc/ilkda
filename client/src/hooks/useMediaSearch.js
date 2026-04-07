import { useState, useCallback, useRef } from 'react'
import { tmdbApi, anilistApi, openlibraryApi, spotifyApi } from '@/lib/api'

const TMDB_TYPES = new Set(['movie', 'tv'])
const ANILIST_TYPES = new Set(['anime', 'manga'])
const OL_TYPES = new Set(['book'])
const SPOTIFY_TYPES = new Set(['album'])

/**
 * media search hook.
 * routes to:
 *   TMDB - movie, tv
 *   AniList - anime, manga
 *   OpenLibrary - book
 */

// extra method — prefill(title):
//    sets query text without firing a search (used when opening edit modal).
export function useMediaSearch() {
  const [query, setQueryRaw] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null) // 'tmdb' | 'anilist' | 'openlibrary' | null
  const timer = useRef(null)

  const setQuery = useCallback((value, type) => {
    setQueryRaw(value)
    setError(null)

    if (timer.current) clearTimeout(timer.current)

    const isSupported = TMDB_TYPES.has(type) || ANILIST_TYPES.has(type) || OL_TYPES.has(type) || SPOTIFY_TYPES.has(type)
    if (!isSupported) { setResults([]); setSource(null); return }
    if (!value.trim()) { setResults([]); return }

    timer.current = setTimeout(async () => {
      const src = TMDB_TYPES.has(type) ? 'tmdb'
                : ANILIST_TYPES.has(type) ? 'anilist'
                : SPOTIFY_TYPES.has(type) ? 'spotify'
                : 'openlibrary'
      setSearching(true)
      setSource(src)
      try {
        let data
        if (TMDB_TYPES.has(type)) data = await tmdbApi.search(value.trim(), type)
        else if (OL_TYPES.has(type)) data = await openlibraryApi.search(value.trim())
        else if (SPOTIFY_TYPES.has(type)) data = await spotifyApi.search(value.trim())
        else data = await anilistApi.search(value.trim(), type)
        setResults(data.results)
      } catch (err) {
        setError(err.message)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [])

  const prefill = useCallback((title) => {
    if (timer.current) clearTimeout(timer.current)
    setQueryRaw(title || '')
    setResults([])
    setSearching(false)
    setError(null)
  }, [])

  const pick = useCallback((result) => {
    setQueryRaw(result.title)
    setResults([])
  }, [])

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setQueryRaw('')
    setResults([])
    setSearching(false)
    setError(null)
    setSource(null)
  }, [])

  return { query, results, searching, error, source, setQuery, prefill, pick, clear }
}
