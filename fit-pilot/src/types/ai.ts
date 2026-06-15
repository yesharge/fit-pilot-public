export type CoverLetterTone = 'formal' | 'conversational' | 'direct'

export interface CoverLetter {
  opening: string
  body: string
  closing: string
  tone: CoverLetterTone
}
export interface DiffSection {
    original: string 
    rewritten: string
    changed: boolean
    note?: string        
}

export interface ExperienceEntry {
    company: string
    title: string
    dates: string
    original: string[]      // original bullets
    bullets: string[]       // rewritten bullets
    changed: boolean
    note?: string
}

export interface RewriteResult {
    summary: DiffSection
    experience: ExperienceEntry[]
    skills: DiffSection     // join/split on ', ' at the edges; keep it a string in the schema
    match_score: { original: number; rewritten: number } // 0–100, model's rating of the original resume vs job
  }

export interface RewriteRecord {
    result: RewriteResult
    coverLetter?: CoverLetter
    promptVersion: string   // e.g. 'v1', 'v2' — tracks which prompt produced this
    createdAt: string
    usedForApplication?: boolean
}

export interface AIMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface AIRequestOptions {
    model: string
    maxTokens: number
    stream: boolean
    apiKey: string
    temperature?: number
    signal?: AbortSignal
}
