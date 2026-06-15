import { useRef, useState } from 'react'
import { usePDFParser } from '@/hooks/usePDFParser'
import styles from './DropZone.module.css'

interface DropZoneProps {
  onParsed: (text: string) => void
}

export function DropZone({ onParsed }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { parseFile, filename, pageCount, tokenCount, status, error } = usePDFParser()

  async function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') return
    const extracted = await parseFile(file)
    if (extracted) onParsed(extracted)
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

  // Parsed: show file summary
  if (status === 'parsed') {
    return (
      <div className={styles.parsed}>
        <span className={styles.parsedIcon}>✓</span>
        <div className={styles.parsedInfo}>
          <span className={styles.parsedName}>{filename}</span>
          <span className={styles.parsedMeta}>
            {pageCount} {pageCount === 1 ? 'page' : 'pages'} · ~{tokenCount.toLocaleString()} tokens
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