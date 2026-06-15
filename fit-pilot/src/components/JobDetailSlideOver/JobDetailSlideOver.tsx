import { SlideOver } from '@/components/SlideOver/SlideOver'
import { StatusStepper } from '@/components/StatusStepper/StatusStepper'
import { RewriteHistory } from '@/components/RewriteHistory/RewriteHistory'
import { formatAppliedAgo } from '@/lib/applicationStatus'
import type { ApplicationStatus } from '@/lib/applicationStatus'
import type { ColumnId, Job } from '@/types/job'
import styles from './JobDetailSlideOver.module.css'

interface JobDetailSlideOverProps {
  job: Job | null
  isOpen: boolean
  hasResume: boolean
  onClose: () => void
  onRewrite: (job: Job) => void
  onMove: (id: string, column: ColumnId) => void
  onStatusChange: (id: string, status: ApplicationStatus) => void
  onNotesChange: (id: string, notes: string) => void
}

const MOVE_ACTIONS: { column: ColumnId; label: string }[] = [
  { column: 'interested', label: 'Interested' },
  { column: 'reviewing', label: 'Reviewing' },
  { column: 'skipped', label: 'Skip' },
]

function fitBadgeClass(score: number | null | undefined): string {
  if (typeof score !== 'number') return styles.badgeGrey
  if (score > 75) return styles.badgeGreen
  if (score >= 50) return styles.badgeAmber
  return styles.badgeGrey
}

export function JobDetailSlideOver({
  job,
  isOpen,
  hasResume,
  onClose,
  onRewrite,
  onMove,
  onStatusChange,
  onNotesChange,
}: JobDetailSlideOverProps) {
  const title = job ? `${job.title} · ${job.company}` : 'Job details'
  const filenameBase = job
    ? `${job.company}-${job.title}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'fitpilot'
    : 'fitpilot'

  return (
    <SlideOver isOpen={isOpen} onClose={onClose} title={title}>
      {!job ? (
        <p className={styles.empty}>Select a job to see details.</p>
      ) : (
        <div className={styles.body}>
          <div className={styles.metaRow}>
            <span className={`${styles.badge} ${fitBadgeClass(job.fitScore)}`}>
              {typeof job.fitScore === 'number' ? `${job.fitScore}% fit` : 'No score yet'}
            </span>
            {job.appliedAt && job.applicationStatus !== 'none' && (
              <span className={styles.appliedMeta}>
                Applied {formatAppliedAgo(job.appliedAt)}
              </span>
            )}
            {job.url && (
              <a
                className={styles.postingLink}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View posting ↗
              </a>
            )}
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Application stage</h3>
            <StatusStepper
              status={job.applicationStatus}
              onStatusChange={status => onStatusChange(job.id, status)}
            />
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Move to</h3>
            <div className={styles.moveActions} role="group" aria-label="Move to column">
              {MOVE_ACTIONS.map(({ column, label }) => (
                <button
                  key={column}
                  type="button"
                  className={`${styles.moveBtn} ${job.column === column ? styles.moveBtnActive : ''}`}
                  onClick={() => onMove(job.id, column)}
                  aria-pressed={job.column === column}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Job description</h3>
            <p className={styles.description}>{job.description || 'No description provided.'}</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Notes</h3>
            <textarea
              key={job.id}
              className={styles.notes}
              defaultValue={job.notes}
              onBlur={e => {
                if (e.target.value !== job.notes) onNotesChange(job.id, e.target.value)
              }}
              placeholder="Follow-up dates, contacts, interview notes…"
              rows={3}
            />
          </section>

          {job.rewrites.length > 0 && (
            <section className={styles.section}>
              <RewriteHistory
                rewrites={job.rewrites}
                defaultExpanded
                filenameBase={filenameBase}
              />
            </section>
          )}

          <button
            type="button"
            className={styles.rewriteBtn}
            onClick={() => onRewrite(job)}
            disabled={!hasResume}
            title={hasResume ? undefined : 'Upload a resume first'}
          >
            Rewrite for this job
          </button>
        </div>
      )}
    </SlideOver>
  )
}
