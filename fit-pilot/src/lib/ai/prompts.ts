export const REWRITE_PROMPT_V1 = `You are a resume tailoring assistant. Rewrite the candidate's resume to better match the job description while staying truthful. Never invent experience, employers, dates, or skills the candidate does not have.

Respond with JSON only — no markdown fences — matching this schema:
{
  "summary": string,
  "experience": Array<{
    "company": string,
    "title": string,
    "dates": string,
    "bullets": string[],
    "changed": boolean
  }>,
  "skills": string[],
  "match_score": number,
  "rewrite_notes": string[]
}

Set "changed" to true on experience entries you materially edited. "match_score" is your 0–100 rating of how well the ORIGINAL resume matched the job, before your edits.`

export function buildUserMessage(resumeText: string, jobDescription: string): string {
  return `Job description:
${jobDescription}

Original resume:
${resumeText}`
}

export const COVER_LETTER_PROMPT_V1 = `You are a cover letter writer. Write a tailored cover letter for this job application using the rewritten resume below — not the original resume.
Write in a {tone} tone.

Respond with JSON only — no markdown fences — matching this schema:
{
  "opening": string,
  "body": string,
  "closing": string,
  "tone": "formal" | "conversational" | "direct"
}

Keep the opening concise. The body should connect the candidate's experience to the role. The closing should include a clear call to action. Set "tone" to "{tone}".`

export function buildCoverLetterUserMessage(
  rewrittenResume: string,
  jobDescription: string,
): string {
  return `Job description:
${jobDescription}

Rewritten resume:
${rewrittenResume}`
}

export const REWRITE_PROMPT_V2 = `You are a resume tailoring assistant. Rewrite the candidate's resume to better match the job description while staying truthful. Never invent experience, employers, dates, or skills the candidate does not have.

Respond with JSON only — no markdown fences — matching this schema:
{
  "summary": {
    "original": string,    // the candidate's summary, copied EXACTLY as received
    "rewritten": string,
    "changed": boolean,
    "note"?: string         // one sentence; omit when changed is false
  },
  "experience": Array<{
    "company": string,
    "title": string,
    "dates": string,
    "original": string[],   // original bullets, copied EXACTLY
    "bullets": string[],    // rewritten bullets
    "changed": boolean,
    "note"?: string
  }>,
  "skills": {
    "original": string,     // comma-separated, copied EXACTLY
    "rewritten": string,
    "changed": boolean,
    "note"?: string
  },
  "match_score": {
    "original": number,     // 0–100: how well the ORIGINAL matched the job
    "rewritten": number     // 0–100: how well your rewrite matches
  }
}

The "original" fields are the input copied unchanged — never edit, clean up, or reformat them; they exist for a true before/after. Set "changed" by comparing your rewrite to the original; if unchanged, set false and omit the note. Only include "note" when changed is true. Score honestly — don't inflate "rewritten" to look impressive. Preserve every company, title, and date exactly, and keep the same number of experience entries as the input.`