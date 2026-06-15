import { useEffect } from 'react'
import { ApiKeyInput } from '@/components/ApiKeyInput/ApiKeyInput'
import styles from './SettingsModal.module.css'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modal}>
        <header className={styles.head}>
          <h2 className={styles.heading}>Settings</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.intro}>
            Paste your own API keys. They&apos;re stored only in this browser tab
            and are sent directly to each provider.
          </p>

          <ApiKeyInput provider="openai" />
          <ApiKeyInput provider="anthropic" />
          <ApiKeyInput provider="jsearch" />

          <p className={styles.hint}>
            OpenAI scores job fit, Anthropic powers rewrites and cover letters,
            and JSearch (via RapidAPI) runs job search.
          </p>
        </div>
      </div>
    </div>
  )
}
