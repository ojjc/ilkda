import { useEffect } from 'react'
import styles from './Modal.module.css'

/**
 * generic modal shell - renders a backdrop + panel with header and optional footer
 *
 * @param {{ title: string, onClose: () => void, footer?: React.ReactNode, children: React.ReactNode }} props
 */
export function Modal({ title, onClose, footer, children, panelClassName }) {
  // close on esc key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.panel} ${panelClassName ?? ''}`}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
