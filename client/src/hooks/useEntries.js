import { useState, useCallback, useRef } from 'react'
import { entriesApi, pinApi } from '@/lib/api'

/**
 * manages two entry lists:
 *   allEntries - full unfiltered library (sidebar counts, profile stats)
 *   entries - filtered view shown in TrackerPage
 *
 * pin() / unpin() update both lists optimistically.
 */
export function useEntries() {
  const [entries, setEntries]    = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading]    = useState(false)
  const [error, setError]      = useState(null)
  const searchTimer = useRef(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { entries: data } = await entriesApi.list({})
      setAllEntries(data)
      setEntries(data)
    } catch (err) {
      console.error('Failed to load entries:', err)
      setError(err.message ?? 'Failed to load entries')
    } finally {
      setLoading(false)
    }
  }, [])

  const load = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const { entries: data } = await entriesApi.list(filters)
      setEntries(data)
    } catch (err) {
      console.error('Failed to load entries:', err)
      setError(err.message ?? 'Failed to load entries')
    } finally {
      setLoading(false)
    }
  }, [])

  const debouncedLoad = useCallback((filters, delay = 300) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(filters), delay)
  }, [load])

  const create = useCallback(async (draft) => {
    const { entry } = await entriesApi.create(draft)
    setEntries((prev) => [entry, ...prev])
    setAllEntries((prev) => [entry, ...prev])
    return entry
  }, [])

  const update = useCallback(async (id, draft) => {
    const { entry } = await entriesApi.update(id, draft)
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)))
    setAllEntries((prev) => prev.map((e) => (e.id === id ? entry : e)))
    return entry
  }, [])

  const remove = useCallback(async (id) => {
    await entriesApi.delete(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setAllEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  /**
   * toggle pin for an entry.
   * returns the updated entry on success, or throws with the server error message
   * (e.g. "you can only pin up to 5 entries").
   */
  const togglePin = useCallback(async (id) => {
    const { entry } = await pinApi.toggle(id)
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)))
    setAllEntries((prev) => prev.map((e) => (e.id === id ? entry : e)))
    return entry
  }, [])

  return {
    entries,
    allEntries,
    loading,
    error,
    loadAll,
    load,
    debouncedLoad,
    create,
    update,
    remove,
    togglePin,
  }
}
