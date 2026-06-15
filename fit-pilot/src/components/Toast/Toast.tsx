import { useEffect } from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {message}
    </div>
  )
}
