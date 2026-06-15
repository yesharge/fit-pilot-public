import type { ApplicationStatus } from '@/lib/applicationStatus'
import type { Job } from '@/types/job'

// One row of eval ground truth: a fit score and the resume version that was
// applied, paired with the real-world outcome. This is the dataset Phase 4 uses
// to check whether higher fit scores actually correlate with better outcomes.
export interface EvalEntry {
  jobId: string
  title: string
  company: string
  fitScore: number | null
  outcome: ApplicationStatus
  appliedAt: string | null
  resumeVersion: number | null // which rewrite version (1-based) was applied
  matchScoreOriginal: number | null
  matchScoreRewritten: number | null
}

/** Build one entry per application (any status other than 'none'). */
export function buildEvalDataset(jobs: Job[]): EvalEntry[] {
  return jobs
    .filter(job => job.applicationStatus !== 'none')
    .map(job => {
      // Prefer the version actually used to apply; otherwise the latest rewrite.
      let versionIndex = job.rewrites.findIndex(r => r.usedForApplication)
      if (versionIndex === -1 && job.rewrites.length > 0) {
        versionIndex = job.rewrites.length - 1
      }
      const record = versionIndex >= 0 ? job.rewrites[versionIndex] : undefined
      const score = record?.result.match_score

      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        fitScore: job.fitScore ?? null,
        outcome: job.applicationStatus,
        appliedAt: job.appliedAt,
        resumeVersion: record ? versionIndex + 1 : null,
        matchScoreOriginal: score?.original ?? null,
        matchScoreRewritten: score?.rewritten ?? null,
      }
    })
}
