import styles from './Toast.module.css'

/**
 * @param {{ message: string, isError: boolean, visible: boolean }} props
 */
export function Toast({ message, isError, visible }) {
  return (
    <div className={`${styles.toast} ${visible ? styles.visible : ''}`}>
      <span
        className={styles.dot}
        style={{ background: isError ? 'var(--danger)' : 'var(--success)' }}
      />
      {message}
    </div>
  )
}
