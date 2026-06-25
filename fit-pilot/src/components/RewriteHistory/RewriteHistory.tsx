import { useState } from 'react'
import { downloadResumePdf } from '@/lib/pdf/resumePdf'
import { downloadCoverLetterPdf } from '@/lib/pdf/coverLetterPdf'
import type { RewriteRecord } from '@/types/ai'
import styles from './RewriteHistory.module.css'

interface RewriteHistoryProps {
  rewrites: RewriteRecord[]
  defaultExpanded?: boolean
  filenameBase?: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RewriteHistory({
  rewrites,
  defaultExpanded = false,
  filenameBase = 'fitpilot',
}: RewriteHistoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (rewrites.length === 0) return null

  return (
    <div className={styles.history}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span>Resume versions</span>
        <span className={styles.toggleCount}>
          {rewrites.length} {rewrites.length === 1 ? 'version' : 'versions'}
        </span>
      </button>

      {expanded && (
        <ul className={styles.list}>
          {[...rewrites].reverse().map((record, reverseIndex) => {
            const versionNumber = rewrites.length - reverseIndex
            const score = record.result.match_score?.rewritten

            return (
              <li key={`${record.createdAt}-${versionNumber}`} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.version}>Version {versionNumber}</span>
                  {record.usedForApplication && (
                    <span className={styles.usedBadge}>Used to apply</span>
                  )}
                </div>
                <span className={styles.date}>{formatDate(record.createdAt)}</span>
                {typeof score === 'number' && (
                  <span className={styles.score}>Match score: {score}%</span>
                )}
                <div className={styles.downloads}>
                  <button
                    type="button"
                    className={styles.downloadBtn}
                    onClick={() =>
                      downloadResumePdf(
                        record.result,
                        `${filenameBase}-v${versionNumber}-resume.pdf`
                      )
                    }
                  >
                    Download resume
                  </button>
                  {record.coverLetter && (
                    <button
                      type="button"
                      className={styles.downloadBtn}
                      onClick={() =>
                        downloadCoverLetterPdf(
                          record.coverLetter!,
                          `${filenameBase}-v${versionNumber}-cover-letter.pdf`,
                          record.result.contact
                        )
                      }
                    >
                      Download cover letter
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
