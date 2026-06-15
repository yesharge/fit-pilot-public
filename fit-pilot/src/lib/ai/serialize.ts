import type { CoverLetter, RewriteResult } from '@/types/ai'

/**
 * Flattens a RewriteResult to plain text — the REWRITTEN side only.
 * This is what the user would submit: keyword matching and the export
 * download both operate on it. Never serialize the `original` fields.
 */
export function serializeRewriteResult(result: RewriteResult): string {
  const sections: string[] = [result.summary.rewritten]

  for (const entry of result.experience) {
    sections.push(`${entry.title}, ${entry.company} (${entry.dates})`)
    for (const bullet of entry.bullets) {
      sections.push(`• ${bullet}`)
    }
  }

  if (result.skills.rewritten.trim().length > 0) {
    sections.push(`Skills: ${result.skills.rewritten}`)
  }

  return sections.join('\n')
}

export function serializeCoverLetter(letter: CoverLetter): string {
  return [letter.opening, letter.body, letter.closing].filter(Boolean).join('\n\n')
}

/** Cover letter first, then rewritten resume — plain text for manual apply paste. */
export function formatApplyContent(
  coverLetter: CoverLetter | null | undefined,
  result: RewriteResult
): string {
  const parts: string[] = []

  if (coverLetter) {
    const letter = serializeCoverLetter(coverLetter).trim()
    if (letter) parts.push(letter)
  }

  const resume = serializeRewriteResult(result).trim()
  if (resume) parts.push(resume)

  return parts.join('\n\n---\n\n')
}