import { serializeRewriteResult } from '@/lib/ai/serialize'
import { downloadText } from '@/lib/download'
import type { RewriteResult } from '@/types/ai'
import styles from './DownloadButton.module.css'

interface DownloadButtonProps {
  result: RewriteResult
  filename: string
}

export function DownloadButton({ result, filename }: DownloadButtonProps) {
  const handleDownload = () => {
    downloadText(serializeRewriteResult(result), filename)
  }

  return (
    <button type="button" className={styles.download} onClick={handleDownload}>
      Download rewritten resume
    </button>
  )
}