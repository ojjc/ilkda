import { useState, useCallback, useRef } from 'react'

/**
 * toast notification.
 * display it for 2.5s
 */
export function useToast() {
  const [toast, setToast] = useState({ message: '', isError: false, visible: false })
  const timer = useRef(null)

  const show = useCallback((message, isError = false) => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, isError, visible: true })
    timer.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }))
    }, 2500)
  }, [])

  return { toast, show }
}
