import { useEffect, useRef, type ReactNode } from 'react'
import styles from './SlideOver.module.css'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  disableClose?: boolean
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function SlideOver({
  isOpen,
  onClose,
  children,
  title,
  disableClose = false,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    if (!panel) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function getFocusable(): HTMLElement[] {
      if (!panel) return []
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    }

    getFocusable()[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !disableClose) {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const elements = getFocusable()
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    function handleFocusIn(e: FocusEvent) {
      if (!panel || panel.contains(e.target as Node)) return
      const elements = getFocusable()
      elements[0]?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose, disableClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close panel"
        onClick={() => !disableClose && onClose()}
        disabled={disableClose}
      />

      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Panel'}
      >
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={disableClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
