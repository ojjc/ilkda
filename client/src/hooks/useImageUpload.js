import { useState, useCallback } from 'react'
import { readImageFile } from '@/lib/image'

/**
 * puts image upload state for a single image field.
 * works with both file-input and drag-and-drop.
 */
export function useImageUpload() {
  const [preview, setPreview] = useState(null) // base64 data URL or null
  const [dragging, setDragging] = useState(false)

  /** loading from file */
  const loadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await readImageFile(file)
    setPreview(dataUrl)
  }, [])

  /** set an existing image (e.g. when editing an entry) */
  const setExisting = useCallback((src) => {
    setPreview(src ?? null)
  }, [])

  const reset = useCallback(() => setPreview(null), [])

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true)  }, [])
  const handleDragLeave = useCallback(() => setDragging(false), [])
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await loadFile(file)
  }, [loadFile])

  const handleInputChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (file) await loadFile(file)
  }, [loadFile])

  return {
    preview,
    dragging,
    loadFile,
    setExisting,
    reset,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
  }
}
