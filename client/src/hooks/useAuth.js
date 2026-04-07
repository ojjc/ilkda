import { useState, useEffect, useCallback } from 'react'
import { authApi } from '@/lib/api'

/**
 * manages authentication state and exposes sign-in / sign-up/ sign-out actions
 * on mount it calls GET /api/auth/me to restore an existing session cookie.
 */
export function useAuth() {
  const [user, setUser]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [ready, setReady]   = useState(false) // false until /me resolves

  // restore session on first render
  useEffect(() => {
    authApi.me()
      .then(({ user }) => { setUser(user); setReady(true) })
      .catch(() => { setUser(null); setReady(true) })
  }, [])

  const signIn = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { user } = await authApi.signIn(payload)
      setUser(user)
      return user
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { user } = await authApi.signUp(payload)
      setUser(user)
      return user
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await authApi.signOut().catch(() => {})
    setUser(null)
  }, [])

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  return { user, loading, ready, signIn, signUp, signOut, updateUser }
}
