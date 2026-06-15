import { useState } from 'react'
import { SettingsModal } from '@/components/SettingsModal/SettingsModal'
import styles from './App.module.css'

interface AppProps {
  children: React.ReactNode
}

export default function App({ children }: AppProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <div className={styles.appContainer}>
          <div className={styles.headerRow}>
            <span className={styles.appWordmark}>fit-pilot</span>
            <button
              type="button"
              className={styles.settingsBtn}
              onClick={() => setSettingsOpen(true)}
            >
              ⚙ Settings
            </button>
          </div>
        </div>
      </header>
      <main className={styles.appMain}>
        <div className={styles.appContainer}>{children}</div>
      </main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
