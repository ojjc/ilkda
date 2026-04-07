import { useState } from 'react'
import { AuthScreen } from './AuthScreen'
import styles from './AuthForm.module.css'

/** sign up
 * @param {{ loading: boolean, onSignUp: (name: string, u: string, p: string) => Promise<void>, onSwitchToSignIn: () => void }} props
 */
export function SignUpForm({ loading, onSignUp, onSwitchToSignIn }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!name.trim() || !username.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    try {
      await onSignUp(name.trim(), username.trim(), password)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthScreen>
      <h2 className={styles.title}>Create account</h2>
      <p className={styles.subtitle}>Start logging your media today</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="su-name">Display Name</label>
          <input
            id="su-name"
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-username">Username</label>
          <input
            id="su-username"
            type="text"
            placeholder="cool_user42"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-password">Password</label>
          <input
            id="su-password"
            type="password"
            placeholder="at least 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className={styles.switchText}>
        Already have an account?{' '}
        <button className={styles.switchLink} onClick={onSwitchToSignIn} type="button">
          Sign in →
        </button>
      </p>
    </AuthScreen>
  )
}
