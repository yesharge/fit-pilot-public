import { useEffect, useRef, useState } from 'react'
import { ApplyButton } from '@/components/ApplyButton/ApplyButton'
import { CoverLetterPanel } from '@/components/CoverLetterPanel/CoverLetterPanel'
import { DiffPane } from '@/components/DiffPane/DiffPane'
import { KeywordCoverage } from '@/components/KeywordCoverage/KeywordCoverage'
import { SlideOver } from '@/components/SlideOver/SlideOver'
import { useRewrite } from '@/hooks/useRewrite'
import type { CoverLetterTone } from '@/types/ai'
import type { CoverLetter, RewriteResult } from '@/types/ai'
import type { Job } from '@/types/job'
import styles from './RewriteSlideOver.module.css'

interface RewriteSlideOverProps {
  job: Job | null
  resumeText: string
  isOpen: boolean
  onClose: () => void
  onComplete?: (jobId: string, result: RewriteResult) => void
  onCoverLetter?: (jobId: string, coverLetter: CoverLetter) => void
  onApply?: (jobId: string) => void
  onToast?: (message: string) => void
  onToastError?: (message: string) => void
}

export function RewriteSlideOver({
  job,
  resumeText,
  isOpen,
  onClose,
  onComplete,
  onCoverLetter,
  onApply,
  onToast,
  onToastError,
}: RewriteSlideOverProps) {
  const {
    status,
    streamingText,
    result,
    error,
    rewrite,
    reset,
    coverLetterStatus,
    coverLetterStreamingText,
    coverLetterResult,
    coverLetterError,
    generateCoverLetter,
  } = useRewrite()
  const reportedCompleteRef = useRef(false)
  const lastCoverRef = useRef<CoverLetter | null>(null)
  const [currentCoverLetter, setCurrentCoverLetter] = useState<CoverLetter | null>(null)
  const isStreaming = status === 'streaming'
  const isCoverLetterStreaming = coverLetterStatus === 'streaming'
  const isComplete = status === 'complete' && result !== null

  const jobId = job?.id

  useEffect(() => {
    if (!isOpen || !jobId || !job) {
      reset()
      reportedCompleteRef.current = false
      lastCoverRef.current = null
      setCurrentCoverLetter(null)
      return
    }

    if (resumeText.trim()) {
      rewrite(resumeText, job.description, { generateCoverLetter: true })
    }
    // jobId gates re-runs; job.description is read from the card at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, jobId, resumeText, rewrite, reset])

  useEffect(() => {
    if (isComplete && job && result && !reportedCompleteRef.current) {
      reportedCompleteRef.current = true
      onComplete?.(job.id, result)
    }
  }, [isComplete, job, result, onComplete])

  // Persist each newly generated cover letter onto the latest rewrite version.
  // Keyed on object identity, so regenerating (new tone) saves the new one.
  useEffect(() => {
    if (
      coverLetterStatus === 'complete' &&
      coverLetterResult &&
      job &&
      coverLetterResult !== lastCoverRef.current
    ) {
      lastCoverRef.current = coverLetterResult
      onCoverLetter?.(job.id, coverLetterResult)
    }
  }, [coverLetterStatus, coverLetterResult, job, onCoverLetter])

  const resumeFilename = (() => {
    if (!job) return 'resume.txt'
    const slug = `${job.company}-${job.title}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return slug ? `${slug}-resume.txt` : 'resume.txt'
  })()

  function handleGenerateCoverLetter(tone: CoverLetterTone) {
    if (!result || !job) return
    generateCoverLetter(result, job.description, tone)
  }

  const title = job ? `${job.title} at ${job.company}` : 'Rewrite'

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      disableClose={isStreaming || isCoverLetterStreaming}
    >
      {!job && <p className={styles.message}>Select a job to rewrite.</p>}

      {job && status === 'streaming' && (
        <div className={styles.streaming} aria-live="polite" aria-busy="true">
          <p className={styles.streamingLabel}>Rewriting resume…</p>
          <pre className={styles.streamingText}>{streamingText || 'Starting…'}</pre>
        </div>
      )}

      {job && status === 'error' && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {job && isComplete && (
        <>
          <DiffPane result={result} downloadFilename={resumeFilename} />
          <KeywordCoverage jobDescription={job.description} result={result} />
          <CoverLetterPanel
            jobTitle={job.title}
            company={job.company}
            status={coverLetterStatus}
            streamingText={coverLetterStreamingText}
            result={coverLetterResult}
            error={coverLetterError}
            onGenerate={handleGenerateCoverLetter}
            onLetterChange={setCurrentCoverLetter}
          />
          {onApply && onToast && onToastError && (
            <div className={styles.applyRow}>
              <ApplyButton
                job={job}
                coverLetter={currentCoverLetter}
                rewriteResult={result}
                disabled={isCoverLetterStreaming || coverLetterStatus !== 'complete'}
                onApply={onApply}
                onSuccess={onToast}
                onError={onToastError}
              />
            </div>
          )}
        </>
      )}
    </SlideOver>
  )
}
