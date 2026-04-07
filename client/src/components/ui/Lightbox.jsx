import { useEffect } from 'react'
import styles from './Lightbox.module.css'

/**
 * full-screen image viewer
 * @param {{ src: string | null, onClose: () => void }} props
 */
export function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [src, onClose])

  if (!src) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      <img
        className={styles.image}
        src={src}
        alt="Full size preview"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
