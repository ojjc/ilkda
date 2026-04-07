import { useState, useEffect } from 'react'
import { SignInForm } from '@/components/auth/SignInForm'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrackerPage } from '@/components/tracker/TrackerPage'
import { ProfilePage } from '@/components/profile/ProfilePage'
import { Toast } from '@/components/ui/Toast'
import { Lightbox } from '@/components/ui/Lightbox'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { useEntries } from '@/hooks/useEntries'
import styles from './App.module.css'

export function App() {
  const auth = useAuth()
  const { toast, show: showToast } = useToast()
  const entriesState = useEntries()

  const [authScreen, setAuthScreen] = useState('signin')
  const [currentPage, setCurrentPage] = useState('tracker')
  const [activeView, setActiveView]  = useState('all')
  const [lightboxSrc, setLightboxSrc] = useState(null)

  // fetch the full unfiltered list once its auth
  useEffect(() => {
    if (auth.user) {
      entriesState.loadAll() // this populates both allEntries (for sidebar counts) and entries (for display)
    }
  }, [auth.user])

  // loading splash screen
  if (!auth.ready) {
    return (
      <div className={styles.splash}>
        <div className={styles.splashSpinner} />
      </div>
    )
  }

  // unauthenticated
  if (!auth.user) {
    return authScreen === 'signin' ? (
      <SignInForm
        loading={auth.loading}
        onSignIn={(username, password) => auth.signIn({ username, password })}
        onSwitchToSignUp={() => setAuthScreen('signup')}
      />
    ) : (
      <SignUpForm
        loading={auth.loading}
        onSignUp={(name, username, password) => auth.signUp({ name, username, password })}
        onSwitchToSignIn={() => setAuthScreen('signin')}
      />
    )
  }

  // authenticated
  const handleViewChange = (view) => {
    setActiveView(view)
    setCurrentPage('tracker')
  }

  return (
    <div className={styles.app}>
      {/*
        sidebar receives allEntries (the full unfiltered list) so that per-type counts and stats never change when the user clicks a filter
      */}
      <Sidebar
        user={auth.user}
        entries={entriesState.allEntries}
        activeView={activeView}
        onViewChange={handleViewChange}
        onProfileClick={() => setCurrentPage('profile')}
        onSignOut={auth.signOut}
      />

      <main className={styles.main}>
        {currentPage === 'tracker' && (
          <TrackerPage
            activeView={activeView}
            entries={entriesState.entries}
            loading={entriesState.loading}
            load={entriesState.load}
            debouncedLoad={entriesState.debouncedLoad}
            create={entriesState.create}
            update={entriesState.update}
            remove={entriesState.remove}
            togglePin={entriesState.togglePin}
            onLightbox={setLightboxSrc}
            onToast={showToast}
          />
        )}

        {currentPage === 'profile' && (
          /*
            ProfilePage also gets allEntries so the stats breakdown reflects the user's full library, not just the current filter.
          */
          <ProfilePage
            user={auth.user}
            entries={entriesState.allEntries}
            onUserUpdate={auth.updateUser}
            onBack={() => setCurrentPage('tracker')}
            onToast={showToast}
          />
        )}
      </main>

      <Toast
        message={toast.message}
        isError={toast.isError}
        visible={toast.visible}
      />

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
