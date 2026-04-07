import styles from './AuthScreen.module.css'

/**
 * auth layout — grid background, centered card.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthScreen({ children }) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoWord}>ilkda 익다</span>
          <span className={styles.logoSub}>media tracker</span>
        </div>
        {children}
      </div>
    </div>
  )
}
