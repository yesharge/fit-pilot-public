import { useEffect, useMemo, useState } from 'react'
import { CoverLetterEditor } from '@/components/CoverLetterEditor/CoverLetterEditor'
import { downloadCoverLetterPdf } from '@/lib/pdf/coverLetterPdf'
import { serializeCoverLetter } from '@/lib/ai/serialize'
import type { ContactInfo, CoverLetter, CoverLetterTone } from '@/types/ai'
import type { CoverLetterStatus } from '@/hooks/useCoverLetter'
import styles from './CoverLetterPanel.module.css'

interface CoverLetterPanelProps {
  jobTitle: string
  company: string
  /** Passthrough contact info from the rewrite — used for the PDF letterhead. */
  contact?: ContactInfo
  status: CoverLetterStatus
  streamingText: string
  result: CoverLetter | null
  error: string | null
  onGenerate: (tone: CoverLetterTone) => void
  onLetterChange?: (letter: CoverLetter | null) => void
}

const TONE_OPTIONS: { value: CoverLetterTone; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'direct', label: 'Direct' },
]

function parseEditedText(text: string, tone: CoverLetterTone): CoverLetter {
  const blocks = text.split(/\n\n+/).map(block => block.trim()).filter(Boolean)

  if (blocks.length === 0) {
    return { opening: '', body: '', closing: '', tone }
  }

  if (blocks.length === 1) {
    return { opening: '', body: blocks[0], closing: '', tone }
  }

  return {
    opening: blocks[0],
    body: blocks.slice(1, -1).join('\n\n'),
    closing: blocks[blocks.length - 1],
    tone,
  }
}

export function CoverLetterPanel({
  jobTitle,
  company,
  contact,
  status,
  streamingText,
  result,
  error,
  onGenerate,
  onLetterChange,
}: CoverLetterPanelProps) {
  const [tone, setTone] = useState<CoverLetterTone>('formal')
  const [letter, setLetter] = useState<CoverLetter | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    if (result) {
      setLetter(result)
      setTone(result.tone)
    }
  }, [result])

  useEffect(() => {
    onLetterChange?.(letter)
  }, [letter, onLetterChange])

  const displayText = useMemo(() => {
    if (status === 'streaming') return streamingText
    if (letter) return serializeCoverLetter(letter)
    return ''
  }, [status, streamingText, letter])

  const serializedCoverLetter = letter ? serializeCoverLetter(letter) : displayText

  const isGenerating = status === 'streaming'
  const hasContent = displayText.length > 0 || status === 'streaming'

  function handleGenerate() {
    setLetter(null)
    setCopyStatus('idle')
    onGenerate(tone)
  }

  function handleEditorChange(text: string) {
    setLetter(parseEditedText(text, tone))
  }

  async function handleCopy() {
    if (!serializedCoverLetter) return

    try {
      await navigator.clipboard.writeText(serializedCoverLetter)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  function handleDownload() {
    const letterToExport = letter ?? (displayText ? parseEditedText(displayText, tone) : null)
    if (!letterToExport) return

    const slug = `${company}-${jobTitle}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    downloadCoverLetterPdf(
      letterToExport,
      slug ? `${slug}-cover-letter.pdf` : 'cover-letter.pdf',
      contact,
    )
  }

  return (
    <section className={styles.panel} aria-label="Cover letter">
      <div className={styles.header}>
        <h3 className={styles.title}>Cover letter</h3>
        <p className={styles.subtitle}>Tailored from your rewritten resume and job description.</p>
      </div>

      <div className={styles.toneRow} role="group" aria-label="Cover letter tone">
        {TONE_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            className={`${styles.toneBtn} ${tone === option.value ? styles.toneBtnActive : ''}`}
            onClick={() => setTone(option.value)}
            aria-pressed={tone === option.value}
            disabled={isGenerating}
          >
            {option.label}
          </button>
        ))}

        <button
          type="button"
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {hasContent && (
        <>
          <CoverLetterEditor
            value={displayText}
            onChange={handleEditorChange}
            isStreaming={isGenerating}
          />

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleCopy}
              disabled={!serializedCoverLetter || isGenerating}
            >
              {copyStatus === 'copied' ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleDownload}
              disabled={!serializedCoverLetter || isGenerating}
            >
              Download PDF
            </button>
          </div>

          {copyStatus === 'error' && (
            <p className={styles.error} role="alert">
              Could not copy to clipboard.
            </p>
          )}
        </>
      )}

      {!hasContent && status === 'idle' && (
        <p className={styles.subtitle}>Cover letter will generate after the resume rewrite completes.</p>
      )}
    </section>
  )
}
