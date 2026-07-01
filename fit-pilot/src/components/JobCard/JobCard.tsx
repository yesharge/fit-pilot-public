import { formatAppliedAgo } from '@/lib/applicationStatus'
import type { Job } from '@/types/job'
import styles from './JobCard.module.css'

interface JobCardProps {
  job: Job
  onOpen: (job: Job) => void
  onDelete: (id: string) => void
}

const SNIPPET_LENGTH = 140

function fitScoreClass(score: number): string {
  if (score > 75) return styles.badgeGreen
  if (score >= 50) return styles.badgeAmber
  return styles.badgeGrey
}

function FitBadge({ fitScore }: { fitScore: number | null | undefined }) {
  if (fitScore === null) {
    return (
      <span
        className={`${styles.badge} ${styles.badgeGrey}`}
        aria-label="No fit score"
        title="Upload a resume to see fit scores"
      >
        —
      </span>
    )
  }
  if (fitScore === undefined) {
    return (
      <span
        className={`${styles.badge} ${styles.badgeSkeleton}`}
        aria-label="Computing fit score"
        aria-busy="true"
      />
    )
  }
  return (
    <span
      className={`${styles.badge} ${fitScoreClass(fitScore)}`}
      aria-label={`Fit score ${fitScore}%`}
    >
      {fitScore}%
    </span>
  )
}

function descriptionSnippet(description: string): string {
  const trimmed = description.trim()
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed
  return `${trimmed.slice(0, SNIPPET_LENGTH)}…`
}

export function JobCard({ job, onOpen, onDelete }: JobCardProps) {
  const isRewritten = job.rewrites.length > 0
  const isApplied = job.appliedAt && job.applicationStatus !== 'none'
  const snippet = descriptionSnippet(job.description)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(job)
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (window.confirm(`Delete "${job.title}" at ${job.company}? This can't be undone.`)) {
      onDelete(job.id)
    }
  }

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job)}
      onKeyDown={handleKeyDown}
      aria-label={`Open ${job.title} at ${job.company}`}
    >
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{job.title}</h3>
          <p className={styles.company}>{job.company}</p>
        </div>
        <div className={styles.headerRight}>
          <FitBadge fitScore={job.fitScore} />
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            aria-label={`Delete ${job.title} at ${job.company}`}
            title="Delete role"
          >
            ×
          </button>
        </div>
      </div>

      {(isRewritten || isApplied) && (
        <div className={styles.pills}>
          {isRewritten && <span className={styles.rewrittenBadge}>Rewritten</span>}
          {isApplied && (
            <span className={styles.appliedMeta}>
              Applied {formatAppliedAgo(job.appliedAt!)}
            </span>
          )}
        </div>
      )}

      {snippet && <p className={styles.snippet}>{snippet}</p>}
    </article>
  )
}
