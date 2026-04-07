import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import styles from './EditProfileModal.module.css'

/**
 * @param {{
 *   user: object,
 *   onSave: (payload: object) => Promise<void>,
 *   onClose: () => void,
 * }} props
 */
export function EditProfileModal({ user, onSave, onClose }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(user.name ?? '')
    setUsername(user.username ?? '')
    setBio(user.bio ?? '')
    setPassword('')
    setError('')
  }, [user])

  const handleSave = async () => {
    if (!name.trim()) { setError('Display name is required.');  return }
    if (!username.trim()) { setError('Username is required.'); return }
    setError(''); setSaving(true)
    try {
      await onSave({ name: name.trim(), username: username.trim(), bio: bio.trim(), password: password || undefined })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit Profile"
      onClose={onClose}
      footer={
        <>
          <button className={styles.btnSecondary} onClick={onClose} type="button">Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ep-name">Display Name</label>
        <input id="ep-name" className={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ep-username">Username</label>
        <input id="ep-username" className={styles.input} type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ep-bio">Bio</label>
        <textarea
          id="ep-bio"
          className={`${styles.input} ${styles.textarea}`}
          placeholder="Tell people a little about yourself…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ep-pass">
          New Password{' '}
          <span className={styles.labelNote}>(leave blank to keep current)</span>
        </label>
        <input
          id="ep-pass"
          className={styles.input}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </Modal>
  )
}
