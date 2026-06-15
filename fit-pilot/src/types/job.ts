import type { RewriteRecord } from "./ai"
import type { ApplicationStatus } from '@/lib/applicationStatus'

export type { ApplicationStatus }
export type JobSource = 'api' | 'manual'
export type ColumnId = 'reviewing' | 'interested' | 'skipped'
export interface Job {
    id: string
    title: string
    company: string
    description: string
    url: string
    postedAt: string
    source: JobSource
   
    // From JSearch v2 — null for manual jobs
    location: string | null
    isRemote: boolean
    employmentType: string | null
    salaryMin: number | null
    salaryMax: number | null
    salaryPeriod: string | null
    employerLogo: string | null
   
    // Set by the app after scoring
    fitScore?: number | null     // number = scored, null = no score (unavailable/failed), undefined = pending
    descriptionVector?: number[]  // embedding of the job description
   
    // Review queue
    column: ColumnId
   
    // Application tracking
    applicationStatus: ApplicationStatus
    appliedAt: string | null
    notes: string
   
    // Rewrite history — each entry is a version
    rewrites: RewriteRecord[]
}

export type DatePosted = 'all' | 'today' | '3days' | 'week' | 'month'
export type WorkArrangement = 'all' | 'remote' | 'onsite' | 'hybrid'
 
export interface JobSearchParams {
  query: string
  location?: string
  datePosted?: DatePosted
  workFromHome?: boolean          // true = remote only
  employmentTypes?: string[]      // 'FULLTIME' | 'PARTTIME' | 'CONTRACTOR' | 'INTERN'
  cursor?: string                 // pass cursor from previous response to paginate
  country?: string                // ISO code e.g. 'us', 'gb', 'ca'
  language?: string               // e.g. 'en'
}
 
export interface JobSearchResult {
  jobs: Job[]
  cursor: string | null           // pass to next call to get the next page
  total: number
}