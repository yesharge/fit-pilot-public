import { downloadResumePdf } from '@/lib/pdf/resumePdf'
import type { RewriteResult } from '@/types/ai'
import styles from './DownloadButton.module.css'

interface DownloadButtonProps {
  result: RewriteResult
  /** Should end in .pdf — the rewritten resume is exported as a styled PDF. */
  filename: string
}

export function DownloadButton({ result, filename }: DownloadButtonProps) {
  const handleDownload = () => {
    downloadResumePdf(result, filename)
  }

  return (
    <button type="button" className={styles.download} onClick={handleDownload}>
      Download rewritten resume (PDF)
    </button>
  )
}
