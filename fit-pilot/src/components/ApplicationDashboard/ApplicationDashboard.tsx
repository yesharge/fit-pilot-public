import { useState } from 'react'
import {
  countByStatus,
  formatAppliedAgo,
  getNextActions,
  getStatusDefinition,
  isValidApplicationStatus,
  type ApplicationStatus,
  type StatusTone,
} from '@/lib/applicationStatus'
import type { Job } from '@/types/job'
import styles from './ApplicationDashboard.module.css'

interface ApplicationDashboardProps {
  jobs: Job[]
  onSelectJob?: (jobId: string) => void
}

type Filter = ApplicationStatus | 'all'

function stageBadgeClass(tone?: StatusTone): string {
  if (tone === 'success') return `${styles.stageBadge} ${styles.stageBadgeSuccess}`
  if (tone === 'error') return `${styles.stageBadge} ${styles.stageBadgeError}`
  if (tone === 'warning') return `${styles.stageBadge} ${styles.stageBadgeWarning}`
  return `${styles.stageBadge} ${styles.stageBadgeDefault}`
}

export function ApplicationDashboard({ jobs, onSelectJob }: ApplicationDashboardProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = countByStatus(jobs)
  const nextActions = getNextActions(jobs)

  const applications = jobs
    .filter(
      job =>
        isValidApplicationStatus(job.applicationStatus) &&
        job.applicationStatus !== 'none' &&
        job.appliedAt
    )
    .sort((a, b) => (b.appliedAt! > a.appliedAt! ? 1 : -1))

  if (applications.length === 0 && nextActions.length === 0) return null

  const filterChips: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: applications.length },
    ...counts
      .filter(c => c.count > 0)
      .map(c => ({ id: c.id as Filter, label: c.label, count: c.count })),
  ]

  const visible =
    filter === 'all'
      ? applications
      : applications.filter(job => job.applicationStatus === filter)

  function Row({
    jobId,
    role,
    badge,
    meta,
  }: {
    jobId: string
    role: string
    badge?: React.ReactNode
    meta: React.ReactNode
  }) {
    const content = (
      <>
        <div className={styles.listItemRole}>{role}</div>
        <div className={styles.rowMeta}>
          {badge}
          <span className={styles.metaText}>{meta}</span>
        </div>
      </>
    )

    if (onSelectJob) {
      return (
        <li>
          <button
            type="button"
            className={`${styles.listItem} ${styles.rowButton}`}
            onClick={() => onSelectJob(jobId)}
          >
            {content}
          </button>
        </li>
      )
    }
    return <li className={styles.listItem}>{content}</li>
  }

  return (
    <section className={styles.dashboard} aria-label="Application tracker">
      <h3 className={styles.title}>Application tracker</h3>

      {applications.length > 0 && (
        <>
          <div className={styles.filters} role="group" aria-label="Filter by stage">
            {filterChips.map(chip => (
              <button
                key={chip.id}
                type="button"
                className={`${styles.filterChip} ${filter === chip.id ? styles.filterChipActive : ''}`}
                onClick={() => setFilter(chip.id)}
                aria-pressed={filter === chip.id}
              >
                {chip.label} ({chip.count})
              </button>
            ))}
          </div>

          <ul className={styles.list}>
            {visible.map(job => {
              const def = getStatusDefinition(job.applicationStatus)
              return (
                <Row
                  key={job.id}
                  jobId={job.id}
                  role={`${job.title} · ${job.company}`}
                  badge={<span className={stageBadgeClass(def.tone)}>{def.label}</span>}
                  meta={job.appliedAt ? `Applied ${formatAppliedAgo(job.appliedAt)}` : ''}
                />
              )
            })}
          </ul>
        </>
      )}

      {nextActions.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Next actions</h4>
          <ul className={styles.list}>
            {nextActions.map(item => (
              <Row
                key={`action-${item.jobId}`}
                jobId={item.jobId}
                role={`${item.title} · ${item.company}`}
                meta={<span className={styles.actionText}>{item.message}</span>}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
