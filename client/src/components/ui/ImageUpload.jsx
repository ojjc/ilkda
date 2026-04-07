import styles from './ImageUpload.module.css'

/**
 * dag-and-drop OR click-to-upload image field with preview
 *
 * @param {{
 *   preview: string | null,
 *   dragging: boolean,
 *   onDragOver: (e: DragEvent) => void,
 *   onDragLeave: () => void,
 *   onDrop: (e: DragEvent) => void,
 *   onInputChange: (e: Event) => void,
 *   onRemove: () => void,
 *   onLightbox: (src: string) => void,
 * }} props
 */
export function ImageUpload({
  preview,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onRemove,
  onLightbox,
}) {
  return (
    <div
      className={`${styles.zone} ${dragging ? styles.dragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {preview ? (
        <div className={styles.preview}>
          <img src={preview} alt="Cover preview" className={styles.previewImg} />
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.actionBtnView}
              onClick={() => onLightbox(preview)}
              title="View full size"
            >
              ⤢
            </button>
            <button
              type="button"
              className={styles.actionBtnRemove}
              onClick={onRemove}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <label className={styles.placeholder}>
          <input
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={onInputChange}
          />
          <span className={styles.icon}>🖼</span>
          <span className={styles.labelText}>Click to upload or drag & drop</span>
          <span className={styles.sub}>PNG, JPG, GIF, WEBP</span>
        </label>
      )}
    </div>
  )
}
