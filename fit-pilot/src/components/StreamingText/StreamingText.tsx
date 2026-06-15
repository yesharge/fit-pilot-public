import styles from './StreamingText.module.css'

interface StreamingTextProps {
  text: string
  /** When true, show the blinking cursor. Hidden once the stream closes. */
  active: boolean
}

/**
 * Phase one of the two-phase render: while the model streams, we hold an
 * incomplete JSON string we cannot parse, so we show it as raw text. Once the
 * stream closes the parent parses into RewriteResult and swaps to the
 * structured diff view (task 1.6). This component stays deliberately dumb.
 */
export function StreamingText({ text, active }: StreamingTextProps) {
  return (
    <pre className={styles.stream} aria-live="polite" aria-busy={active}>
      {text}
      {active && <span className={styles.cursor} aria-hidden="true" />}
    </pre>
  )
}