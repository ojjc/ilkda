import { useState } from 'react'
import { AuthScreen } from './AuthScreen'
import styles from './AuthForm.module.css'

/** sign in
 * @param {{ loading: boolean, onSignIn: (u: string, p: string) => Promise<void>, onSwitchToSignUp: () => void }} props
 */
export function SignInForm({ loading, onSignIn, onSwitchToSignUp }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!username.trim() || !password) { setError('Please fill in all fields.'); return }
    setError('')
    try {
      await onSignIn(username.trim(), password)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthScreen>
      <h2 className={styles.title}>Welcome back</h2>
      <p className={styles.subtitle}>Sign in to continue to your library</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="si-username">Username</label>
          <input
            id="si-username"
            type="text"
            placeholder="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="si-password">Password</label>
          <input
            id="si-password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className={styles.switchText}>
        No account?{' '}
        <button className={styles.switchLink} onClick={onSwitchToSignUp} type="button">
          Create one →
        </button>
      </p>
    </AuthScreen>
  )
}
