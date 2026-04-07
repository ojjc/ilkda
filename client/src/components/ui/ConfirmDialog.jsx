import styles from './ConfirmDialog.module.css'

/**
 * for deleting entries, add a confirmation message to confirm a user wants to delete an entry
 * renders a modal with confirm/cancel messages
 *
 * @param {{
 *   message: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 * }} props
 */
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.box}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} type="button">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
