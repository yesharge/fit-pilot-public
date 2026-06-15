import { formatApplyContent } from '@/lib/ai/serialize'
import type { CoverLetter, RewriteResult } from '@/types/ai'
import type { Job } from '@/types/job'
import styles from './ApplyButton.module.css'

interface ApplyButtonProps {
  job: Job
  coverLetter: CoverLetter | null
  rewriteResult: RewriteResult
  disabled?: boolean
  onApply: (jobId: string) => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export function ApplyButton({
  job,
  coverLetter,
  rewriteResult,
  disabled = false,
  onApply,
  onSuccess,
  onError,
}: ApplyButtonProps) {
  const isDisabled = disabled || !coverLetter

  async function handleApply() {
    if (!coverLetter) return

    const content = formatApplyContent(coverLetter, rewriteResult)
    if (!content.trim()) {
      onError('Nothing to copy — generate a cover letter first.')
      return
    }

    try {
      await navigator.clipboard.writeText(content)
    } catch {
      onError('Could not copy to clipboard.')
      return
    }

    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer')
    }

    onApply(job.id)

    const message = job.url
      ? 'Copied to clipboard — application page opened'
      : 'Copied to clipboard — paste into the application'

    onSuccess(message)
  }

  return (
    <button
      type="button"
      className={styles.applyBtn}
      onClick={handleApply}
      disabled={isDisabled}
      title={isDisabled ? 'Generate a cover letter first' : undefined}
    >
      Apply
    </button>
  )
}
