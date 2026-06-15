import type { Job, JobSearchParams, JobSearchResult } from '@/types/job'
import { HAS_BACKEND } from '@/lib/config'
import { callFunction } from '@/lib/supabase'
import { getJSearchKey } from '@/lib/ai/providers/apiKey'

const BASE_URL = 'https://jsearch.p.rapidapi.com'


export class JobSearchError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'JobSearchError'
    this.status = status;
  }
}

export async function searchJobs(
  params: JobSearchParams
): Promise<JobSearchResult> {
  const {
    query,
    location,
    datePosted = 'month',
    workFromHome = false,
    employmentTypes,
    cursor,
    country = 'us',
    language = 'en',
  } = params

  const fullQuery = location ? `${query} in ${location}` : query

  const searchParams = new URLSearchParams({
    query: fullQuery,
    country,
    language,
    date_posted: datePosted,
    ...(workFromHome && { work_from_home: 'true' }),
    ...(employmentTypes?.length && { employment_types: employmentTypes.join(',') }),
    ...(cursor && { cursor }),
  })

  // Backend mode proxies through the `jsearch` edge function (key server-side);
  // client mode calls RapidAPI directly with the user's own key.
  let res: Response
  if (HAS_BACKEND) {
    res = await callFunction('jsearch', { searchParams: searchParams.toString() })
  } else {
    const apiKey = getJSearchKey()
    if (!apiKey) {
      throw new JobSearchError('Add your JSearch API key in Settings to search jobs.')
    }
    res = await fetch(`${BASE_URL}/search-v2?${searchParams}`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      },
    })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new JobSearchError(
      body?.message ?? `Job search failed with status ${res.status}`,
      res.status
    )
  }

  const data = await res.json()

  // /search-v2 nests results under data.data.jobs (an object), while the older
  // /search returned data.data directly (an array). Handle both shapes.
  const payload = data?.data
  const rawJobs: any[] = Array.isArray(payload) ? payload : (payload?.jobs ?? [])

  return {
    jobs: rawJobs.map(mapToJob),
    cursor: data?.next_cursor ?? payload?.next_page_token ?? null,
    total: data?.total ?? payload?.total ?? rawJobs.length,
  }
}

// ─── Response mapping ────────────────────────────────────────────────────────
// Everything downstream only sees Job — nothing outside this file

function mapToJob(raw: any): Job {
  return {
    id: raw.job_id,
    title: raw.job_title ?? 'Untitled',
    company: raw.employer_name ?? 'Unknown',
    description: raw.job_description ?? '',
    url: raw.job_apply_link ?? '',
    postedAt: raw.job_posted_at_datetime_utc ?? '',
    source: 'api',

    // Optional fields — used in the review queue and status tracker
    location: raw.job_location ?? null,
    isRemote: raw.work_arrangement === 'remote' || raw.job_is_remote === true,
    employmentType: raw.job_employment_type ?? null,
    salaryMin: raw.job_min_salary ?? null,
    salaryMax: raw.job_max_salary ?? null,
    salaryPeriod: raw.job_salary_period ?? null,
    employerLogo: raw.employer_logo ?? null,
  
    // Initial app state — set here so every Job is fully typed from creation
    column: 'interested',
    applicationStatus: 'none',
    appliedAt: null,
    notes: '',
    rewrites: []
}
}