/** Minimal job fields used by status metrics — avoids importing the full Job type. */
export interface JobStatusFields {
  id: string
  title: string
  company: string
  applicationStatus: ApplicationStatus
  appliedAt: string | null
}
export const APPLICATION_STATUS_CONFIG = [
  {
    id: 'none',
    label: 'Not applied',
    order: 0,
    showInStepper: false,
    showInDashboard: false,
  },
  {
    id: 'applied',
    label: 'Applied',
    order: 1,
    showInStepper: true,
    showInDashboard: true,
    nextActionReminder: 'Follow up if you have not heard back',
    followUpAfterDays: 7,
  },
  {
    id: 'interview',
    label: 'Interview',
    order: 2,
    showInStepper: true,
    showInDashboard: true,
    nextActionReminder: 'Prepare for your interview',
  },
  {
    id: 'offer',
    label: 'Offer',
    order: 3,
    showInStepper: true,
    showInDashboard: true,
    nextActionReminder: 'Review and respond to the offer',
    tone: 'success' as const,
  },
  {
    id: 'rejected',
    label: 'Rejected',
    order: 4,
    showInStepper: true,
    showInDashboard: true,
    tone: 'error' as const,
  },
  {
    id: 'ghosted',
    label: 'Ghosted',
    order: 5,
    showInStepper: true,
    showInDashboard: true,
    tone: 'warning' as const,
  },
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUS_CONFIG)[number]['id']

export type StatusTone = 'default' | 'success' | 'warning' | 'error'

/** Terminal outcomes — used by the stepper styling and eval analysis. */
export const POSITIVE_OUTCOMES: ApplicationStatus[] = ['interview', 'offer']
export const NEGATIVE_OUTCOMES: ApplicationStatus[] = ['rejected', 'ghosted']

export interface ApplicationStatusDefinition {
  id: ApplicationStatus
  label: string
  order: number
  showInStepper: boolean
  showInDashboard: boolean
  nextActionReminder?: string
  followUpAfterDays?: number
  tone?: StatusTone
}

const STATUS_BY_ID = new Map<string, ApplicationStatusDefinition>(
  APPLICATION_STATUS_CONFIG.map(def => [def.id, def])
)

const VALID_IDS = new Set<string>(APPLICATION_STATUS_CONFIG.map(def => def.id))

export function isValidApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && VALID_IDS.has(value)
}

export function getStatusDefinition(id: ApplicationStatus): ApplicationStatusDefinition {
  return STATUS_BY_ID.get(id) ?? STATUS_BY_ID.get('none')!
}

export function getStepperStatuses(): ApplicationStatusDefinition[] {
  return APPLICATION_STATUS_CONFIG.filter(def => def.showInStepper).sort(
    (a, b) => a.order - b.order
  )
}

export function getDashboardStatuses(): ApplicationStatusDefinition[] {
  return APPLICATION_STATUS_CONFIG.filter(def => def.showInDashboard).sort(
    (a, b) => a.order - b.order
  )
}

export function getStatusOrder(id: ApplicationStatus): number {
  return getStatusDefinition(id).order
}

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)))
}

export function formatDaysSince(isoDate: string): string {
  const days = daysSince(isoDate)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

/** Human phrase for elapsed time, already including 'ago' where appropriate. */
export function formatAppliedAgo(isoDate: string): string {
  const days = daysSince(isoDate)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export interface StatusCount {
  id: ApplicationStatus
  label: string
  count: number
  tone?: StatusTone
}

export function countByStatus(jobs: JobStatusFields[]): StatusCount[] {
  const counts = new Map<ApplicationStatus, number>()
  for (const def of getDashboardStatuses()) {
    counts.set(def.id, 0)
  }

  for (const job of jobs) {
    const status = isValidApplicationStatus(job.applicationStatus)
      ? job.applicationStatus
      : 'none'
    if (counts.has(status)) {
      counts.set(status, (counts.get(status) ?? 0) + 1)
    }
  }

  return getDashboardStatuses().map(def => ({
    id: def.id,
    label: def.label,
    count: counts.get(def.id) ?? 0,
    tone: def.tone,
  }))
}

export interface NextActionItem {
  jobId: string
  title: string
  company: string
  message: string
  daysSinceApplied?: number
}

export function getNextActions(jobs: JobStatusFields[]): NextActionItem[] {
  const actions: NextActionItem[] = []

  for (const job of jobs) {
    if (!isValidApplicationStatus(job.applicationStatus)) continue
    if (
      job.applicationStatus === 'none' ||
      job.applicationStatus === 'rejected' ||
      job.applicationStatus === 'ghosted'
    )
      continue

    const def = getStatusDefinition(job.applicationStatus)
    if (!def.nextActionReminder) continue

    const daysSinceApplied = job.appliedAt ? daysSince(job.appliedAt) : undefined

    if (
      def.followUpAfterDays !== undefined &&
      daysSinceApplied !== undefined &&
      daysSinceApplied < def.followUpAfterDays
    ) {
      continue
    }

    const message =
      def.followUpAfterDays !== undefined && daysSinceApplied !== undefined
        ? `${def.nextActionReminder} (${formatDaysSince(job.appliedAt!)} since applying)`
        : def.nextActionReminder

    actions.push({
      jobId: job.id,
      title: job.title,
      company: job.company,
      message,
      daysSinceApplied,
    })
  }

  return actions.sort((a, b) => (b.daysSinceApplied ?? 0) - (a.daysSinceApplied ?? 0))
}

export interface AppliedJobSummary {
  jobId: string
  title: string
  company: string
  daysSinceApplied: number
}

export function getAppliedSummaries(jobs: JobStatusFields[]): AppliedJobSummary[] {
  return jobs
    .filter(job => job.applicationStatus !== 'none' && job.appliedAt)
    .map(job => ({
      jobId: job.id,
      title: job.title,
      company: job.company,
      daysSinceApplied: daysSince(job.appliedAt!),
    }))
    .sort((a, b) => b.daysSinceApplied - a.daysSinceApplied)
}
