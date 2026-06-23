import { useCallback, useEffect, useRef, useState } from 'react'
import { RewriteSlideOver } from '@/components/RewriteSlideOver/RewriteSlideOver'
import { Toast } from '@/components/Toast/Toast'
import { DropZone } from '@/components/DropZone/DropZone.tsx'
import { JobQueue } from '@/components/JobQueue/JobQueue'
import { ApplicationDashboard } from '@/components/ApplicationDashboard/ApplicationDashboard'
import { AddJobModal } from '@/components/AddJobModal/AddJobModal'
import { JobDetailSlideOver } from '@/components/JobDetailSlideOver/JobDetailSlideOver'
import { EvalsPanel } from '@/components/EvalsPanel/EvalsPanel'
import type { Job } from '@/types/job'
import type { RewriteResult } from '@/types/ai.ts'
import { useJobSearch } from '@/hooks/useJobSearch'
import { useToast } from '@/hooks/useToast'
import { embed } from '@/lib/embeddings'
import { countByStatus } from '@/lib/applicationStatus'
import { getApiKey } from '@/lib/ai/providers/apiKey'
import { HAS_BACKEND } from '@/lib/config'
import { loadResumeSync, loadResumeAsync, persistResume } from '@/lib/resumeStore'
import styles from './Home.module.css'

type AddTab = 'search' | 'paste'

/** Metadata from the PDF parser, persisted so the upload zone can show the
 *  saved file after a reload. */
export interface ResumeMeta {
  filename: string
  pageCount: number
  tokenCount: number
}

const STEPS: { title: string; copy: string }[] = [
  { title: 'Upload resume', copy: 'You are here' },
  { title: 'Add jobs', copy: 'Search or paste a listing' },
  { title: 'Tailor & track', copy: 'Rewrite, apply, move through stages' },
]

export default function Home() {
  // Rehydrate a previously uploaded resume so a reload lands on the dashboard
  // instead of forcing a re-upload. Sync load is localStorage (client mode);
  // backend mode loads from Postgres async in the effect below.
  const [saved] = useState(() => loadResumeSync())
  const resumeVectorRef = useRef<number[] | null>(saved?.vector ?? null)
  // Only treat the stored text as "already embedded" if a vector was saved with
  // it; otherwise a reload should re-embed.
  const lastEmbeddedTextRef = useRef<string | null>(saved?.vector ? saved.text : null)
  const [resumeText, setResumeText] = useState(saved?.text ?? '')
  const [hasResume, setHasResume] = useState(Boolean(saved))
  const [resumeReady, setResumeReady] = useState(Boolean(saved?.vector))
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(
    saved
      ? { filename: saved.filename, pageCount: saved.pageCount, tokenCount: saved.tokenCount }
      : null
  )
  const [rewriteJob, setRewriteJob] = useState<Job | null>(null)
  const [detailJobId, setDetailJobId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState<AddTab>('search')
  const { message: toastMessage, showToast, dismissToast } = useToast()
  const {
    search,
    cancelSearch,
    addManual,
    jobs,
    total,
    status,
    error,
    setRewrite,
    setCoverLetter,
    moveJob,
    setApplicationStatus,
    setNotes,
    markApplied,
  } = useJobSearch(resumeVectorRef, resumeReady)

  const counts = countByStatus(jobs)
  const hasJobs = jobs.length > 0
  const detailJob = detailJobId ? jobs.find(j => j.id === detailJobId) ?? null : null

  // Backend mode: the resume lives in Postgres, so load it on mount and hydrate
  // the same state the localStorage path seeds synchronously.
  useEffect(() => {
    if (!HAS_BACKEND) return
    let cancelled = false
    loadResumeAsync()
      .then(stored => {
        if (cancelled || !stored) return
        setResumeText(stored.text)
        setHasResume(true)
        setResumeMeta({
          filename: stored.filename,
          pageCount: stored.pageCount,
          tokenCount: stored.tokenCount,
        })
        if (stored.vector) {
          resumeVectorRef.current = stored.vector
          lastEmbeddedTextRef.current = stored.text
          setResumeReady(true)
        }
      })
      .catch(err => console.error('[Home] Failed to load resume:', err))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleResumeParsed(text: string, meta?: ResumeMeta) {
    const hasText = text.trim().length > 0
    setResumeText(text)
    setHasResume(hasText)
    if (meta) setResumeMeta(meta)

    const persistMeta: ResumeMeta =
      meta ?? resumeMeta ?? { filename: 'resume.pdf', pageCount: 0, tokenCount: 0 }

    if (text === lastEmbeddedTextRef.current) return

    if (!HAS_BACKEND && !getApiKey('openai')) {
      console.error('[Home] Missing OpenAI API key')
      // Still persist the text so the dashboard survives a reload; scoring will
      // pick up once a key is added and the resume is re-embedded.
      if (hasText) void persistResume({ text, vector: null, ...persistMeta })
      return
    }

    try {
      const vector = await embed(text)
      resumeVectorRef.current = vector
      lastEmbeddedTextRef.current = text
      setHasResume(true)
      setResumeReady(true)
      void persistResume({ text, vector, ...persistMeta })
    } catch (err) {
      console.error('[Home] Resume embedding failed:', err)
      setResumeReady(false)
      if (hasText) void persistResume({ text, vector: null, ...persistMeta })
    }
  }

  function openAdd(tab: AddTab) {
    setAddTab(tab)
    setAddOpen(true)
  }

  const handleRewriteComplete = useCallback(
    (jobId: string, result: RewriteResult) => {
      setRewrite(jobId, result)
    },
    [setRewrite]
  )

  return (
    <div className={styles.home}>
      {/* idx 0 — tracker chips (resume present) */}
      {hasResume && (
        <div className={styles.tracker} aria-label="Application tracker summary">
          {counts.map(({ id, label, count }) => (
            <div key={id} className={styles.chip}>
              <span className={styles.chipValue}>{count}</span>
              <span className={styles.chipLabel}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* idx 1 — hero copy (first run) */}
      {!hasResume && (
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Let&apos;s tailor your resume to the right jobs</h1>
          <p className={styles.heroSubtitle}>
            Upload your resume once. fit-pilot scores every job against it and
            rewrites it per application.
          </p>
        </div>
      )}

      {/* idx 2 — DropZone wrapper (stays mounted across states) */}
      <div className={hasResume ? styles.toolbar : styles.heroDrop}>
        <DropZone onParsed={handleResumeParsed} savedResume={resumeMeta} />
        {hasResume && (
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.searchEntry}
              onClick={() => openAdd('search')}
            >
              Search a role…
            </button>
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => openAdd('paste')}
            >
              + Add job
            </button>
          </div>
        )}
      </div>

      {/* idx 3 — getting-started steps (first run) */}
      {!hasResume && (
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className={`${styles.step} ${i === 0 ? styles.stepActive : ''}`}
            >
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepCopy}>{step.copy}</span>
            </li>
          ))}
        </ol>
      )}

      {/* idx 4 — board area (resume present) */}
      {hasResume && (
        <div className={styles.board}>
          {hasJobs ? (
            <>
              <ApplicationDashboard jobs={jobs} onSelectJob={setDetailJobId} />
              <EvalsPanel jobs={jobs} />
              <p className={styles.resultCount}>
                {total} {total === 1 ? 'job' : 'jobs'} in queue — sorted by fit score
              </p>
              <JobQueue
                jobs={jobs}
                onOpen={job => setDetailJobId(job.id)}
                onMove={moveJob}
              />
            </>
          ) : (
            <div className={styles.emptyBoard}>
              <h2 className={styles.emptyTitle}>Your resume is ready — now add a job</h2>
              <p className={styles.emptyCopy}>
                Search for a role or paste a listing. fit-pilot scores each one
                against your resume and lines them up here by fit.
              </p>
              <div className={styles.emptyActions}>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => openAdd('search')}
                >
                  Search jobs
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => openAdd('paste')}
                >
                  Paste a listing
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <AddJobModal
          initialTab={addTab}
          onClose={() => {
            cancelSearch()
            setAddOpen(false)
          }}
          onSearch={search}
          onAddManual={addManual}
          searchStatus={status}
          searchError={error}
        />
      )}

      <JobDetailSlideOver
        job={detailJob}
        isOpen={detailJob !== null}
        hasResume={hasResume}
        onClose={() => setDetailJobId(null)}
        onRewrite={job => {
          setDetailJobId(null)
          setRewriteJob(job)
        }}
        onMove={moveJob}
        onStatusChange={setApplicationStatus}
        onNotesChange={setNotes}
      />

      <RewriteSlideOver
        job={rewriteJob}
        resumeText={resumeText}
        isOpen={rewriteJob !== null}
        onClose={() => setRewriteJob(null)}
        onComplete={handleRewriteComplete}
        onCoverLetter={setCoverLetter}
        onApply={markApplied}
        onToast={showToast}
        onToastError={showToast}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={dismissToast} />}
    </div>
  )
}