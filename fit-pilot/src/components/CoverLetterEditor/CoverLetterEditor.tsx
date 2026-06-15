import { useEffect, useRef } from 'react'
import styles from './CoverLetterEditor.module.css'

interface CoverLetterEditorProps {
  value: string
  onChange: (text: string) => void
  isStreaming?: boolean
}

export function CoverLetterEditor({ value, onChange, isStreaming = false }: CoverLetterEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)

  useEffect(() => {
    const el = editorRef.current
    if (!el || isFocusedRef.current) return
    if (el.textContent !== value) {
      el.textContent = value
    }
  }, [value])

  function handleBlur() {
    isFocusedRef.current = false
    const text = editorRef.current?.innerText ?? ''
    onChange(text)
  }

  function handleFocus() {
    isFocusedRef.current = true
  }

  function applyFormat(command: 'bold' | 'italic' | 'underline') {
    editorRef.current?.focus()
    document.execCommand(command, false)
  }

  return (
    <div className={styles.wrapper}>
      {!isStreaming && (
        <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
          <button
            type="button"
            className={styles.formatBtn}
            onMouseDown={e => {
              e.preventDefault()
              applyFormat('bold')
            }}
            aria-label="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={styles.formatBtn}
            onMouseDown={e => {
              e.preventDefault()
              applyFormat('italic')
            }}
            aria-label="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={styles.formatBtn}
            onMouseDown={e => {
              e.preventDefault()
              applyFormat('underline')
            }}
            aria-label="Underline"
          >
            <span className={styles.underline}>U</span>
          </button>
        </div>
      )}

      <div
        ref={editorRef}
        className={`${styles.editor} ${isStreaming ? styles.editorStreaming : ''}`}
        contentEditable={!isStreaming}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Cover letter"
        aria-multiline="true"
        aria-busy={isStreaming}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
    </div>
  )
}
