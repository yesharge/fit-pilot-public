import { useRef, useState } from 'react'
import { usePDFParser } from '@/hooks/usePDFParser'
import styles from './DropZone.module.css'

interface SavedResume {
  filename: string
  pageCount: number
  tokenCount: number
}

interface DropZoneProps {
  onParsed: (
    text: string,
    meta?: { filename: string; pageCount: number; tokenCount: number }
  ) => void
  /** A resume restored from storage; shown as the file summary until the user
   *  uploads a new one this session. Reactive, so a resume that loads
   *  asynchronously (backend mode) still appears once it arrives. */
  savedResume?: SavedResume | null
}

export function DropZone({ onParsed, savedResume }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { parseFile, filename, pageCount, tokenCount, status, error } = usePDFParser()

  // Show the summary either for a file parsed this session, or for a resume
  // restored from storage (when the parser is still idle).
  const summary =
    status === 'parsed'
      ? { filename, pageCount, tokenCount }
      : status === 'idle' && savedResume
        ? savedResume
        : null

  async function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') return
    const result = await parseFile(file)
    if (result) {
      onParsed(result.text, {
        filename: result.filename,
        pageCount: result.pageCount,
        tokenCount: result.tokenCount,
      })
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  // Fallback: PDF parse failed
  if (status === 'error') {
    return (
      <div className={styles.fallback}>
        <p className={styles.errorMsg}>{error ?? 'Could not parse PDF.'} Paste your resume below.</p>
        <textarea
          className={styles.textarea}
          placeholder="Paste your resume text here"
          onChange={e => onParsed(e.target.value)}
          rows={10}
        />
      </div>
    )
  }

  // Parsed this session, or restored from storage: show the file summary.
  if (summary) {
    return (
      <div className={styles.parsed}>
        <span className={styles.parsedIcon}>✓</span>
        <div className={styles.parsedInfo}>
          <span className={styles.parsedName}>{summary.filename}</span>
          <span className={styles.parsedMeta}>
            {summary.pageCount} {summary.pageCount === 1 ? 'page' : 'pages'} · ~
            {summary.tokenCount.toLocaleString()} tokens
          </span>
        </div>
        <button
          type="button"
          className={styles.replaceBtn}
          onClick={() => inputRef.current?.click()}
        >
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className={styles.hiddenInput}
          onChange={onInputChange}
        />
      </div>
    )
  }

  // Default: idle or parsing
  const zoneClass = [
    styles.zone,
    dragging ? styles.zoneDragging : '',
    status === 'parsing' ? styles.zoneParsing : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={zoneClass}
      onClick={() => status !== 'parsing' && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className={styles.hiddenInput}
        onChange={onInputChange}
      />
      {status === 'parsing' ? (
        <span className={styles.parsingLabel}>Parsing PDF…</span>
      ) : (
        <>
          <span className={styles.zoneIcon}>{dragging ? '↓' : '↑'}</span>
          <span className={styles.zoneLabel}>
            {dragging ? 'Drop to upload' : 'Drop your resume or click to browse'}
          </span>
          <span className={styles.zoneHint}>.pdf only</span>
        </>
      )}
    </div>
  )
}