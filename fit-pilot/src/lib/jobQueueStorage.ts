import { isValidApplicationStatus } from '@/lib/applicationStatus'
import type { ColumnId, Job, JobSource } from '@/types/job'
import type { RewriteRecord } from '@/types/ai'

const STORAGE_KEY = 'fit-pilot-job-queue'
const LEGACY_COLUMNS_KEY = 'fit-pilot-job-columns'

const VALID_COLUMNS = new Set<ColumnId>(['interested', 'reviewing', 'skipped'])
const VALID_SOURCES = new Set<JobSource>(['api', 'manual'])

/** Strip embeddings before writing — they're large and recomputed on scoring. */
function toPersisted(job: Job): Job {
  const { descriptionVector: _, ...rest } = job
  return rest
}

function parseColumn(value: unknown, fallback: ColumnId = 'reviewing'): ColumnId {
  return VALID_COLUMNS.has(value as ColumnId) ? (value as ColumnId) : fallback
}

function parseJob(raw: unknown, legacyColumns: Record<string, ColumnId>): Job | null {
  if (typeof raw !== 'object' || raw === null) return null

  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id) return null
  if (typeof o.title !== 'string') return null
  if (typeof o.company !== 'string') return null
  if (typeof o.description !== 'string') return null

  const source = VALID_SOURCES.has(o.source as JobSource)
    ? (o.source as JobSource)
    : 'manual'

  const column = legacyColumns[o.id] ?? parseColumn(o.column)

  let fitScore: number | null | undefined
  if (o.fitScore === null) {
    fitScore = null
  } else if (typeof o.fitScore === 'number') {
    fitScore = o.fitScore
  }

  const applicationStatus = isValidApplicationStatus(o.applicationStatus)
    ? o.applicationStatus
    : 'none'

  const rewrites = parseRewrites(o.rewrites)

  return {
    id: o.id,
    title: o.title,
    company: o.company,
    description: o.description,
    url: typeof o.url === 'string' ? o.url : '',
    postedAt: typeof o.postedAt === 'string' ? o.postedAt : new Date().toISOString(),
    source,
    location: typeof o.location === 'string' ? o.location : null,
    isRemote: o.isRemote === true,
    employmentType: typeof o.employmentType === 'string' ? o.employmentType : null,
    salaryMin: typeof o.salaryMin === 'number' ? o.salaryMin : null,
    salaryMax: typeof o.salaryMax === 'number' ? o.salaryMax : null,
    salaryPeriod: typeof o.salaryPeriod === 'string' ? o.salaryPeriod : null,
    employerLogo: typeof o.employerLogo === 'string' ? o.employerLogo : null,
    fitScore,
    column,
    applicationStatus,
    appliedAt: typeof o.appliedAt === 'string' ? o.appliedAt : null,
    notes: typeof o.notes === 'string' ? o.notes : '',
    rewrites,
  }
}

function parseRewrites(value: unknown): RewriteRecord[] {
  if (!Array.isArray(value)) return []

  const records: RewriteRecord[] = []

  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue
    const r = raw as Record<string, unknown>
    if (typeof r.createdAt !== 'string' || typeof r.promptVersion !== 'string') continue
    if (typeof r.result !== 'object' || r.result === null) continue

    const record: RewriteRecord = {
      result: r.result as RewriteRecord['result'],
      promptVersion: r.promptVersion,
      createdAt: r.createdAt,
    }

    if (typeof r.coverLetter === 'object' && r.coverLetter !== null) {
      record.coverLetter = r.coverLetter as RewriteRecord['coverLetter']
    }
    if (r.usedForApplication === true) {
      record.usedForApplication = true
    }

    records.push(record)
  }

  return records
}

function loadLegacyColumnAssignments(): Record<string, ColumnId> {
  try {
    const raw = localStorage.getItem(LEGACY_COLUMNS_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}

    const assignments: Record<string, ColumnId> = {}
    for (const [id, column] of Object.entries(parsed)) {
      if (VALID_COLUMNS.has(column as ColumnId)) {
        assignments[id] = column as ColumnId
      }
    }
    return assignments
  } catch {
    return {}
  }
}

export function loadJobQueue(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const legacyColumns = loadLegacyColumnAssignments()

    if (!raw) {
      if (Object.keys(legacyColumns).length > 0) {
        localStorage.removeItem(LEGACY_COLUMNS_KEY)
      }
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const jobs = parsed
      .map(item => parseJob(item, legacyColumns))
      .filter((job): job is Job => job !== null)

    if (Object.keys(legacyColumns).length > 0) {
      localStorage.removeItem(LEGACY_COLUMNS_KEY)
    }

    return jobs
  } catch {
    return []
  }
}

export function saveJobQueue(jobs: Job[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.map(toPersisted)))
}
