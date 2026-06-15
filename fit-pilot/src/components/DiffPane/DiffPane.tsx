// src/components/DiffPane.tsx
import type { RewriteResult } from '@/types/ai'
import { ResumeSection, ExperienceSection } from '@/components/ResumeSection/ResumeSection'
import styles from './DiffPane.module.css'
import { DownloadButton } from '../DownloadButton/DownloadButton'

interface DiffPaneProps {
  result: RewriteResult
  downloadFilename: string
}

export function DiffPane({ result, downloadFilename }: DiffPaneProps) {
  return (
    <section className={styles.diffPane} aria-label="Resume rewrite diff">
      <div className={styles.scoreRow}>
        <span className={styles.scoreLabel}>Match score</span>
        <span className={styles.scoreCompare}>
          <span className={styles.scoreBefore}>{result.match_score.original}</span>
          <span className={styles.arrow} aria-hidden="true">→</span>
          <span className={styles.scoreAfter}>{result.match_score.rewritten}</span>
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.colHeader}>Original</div>
        <div className={styles.colHeader}>Rewritten</div>

        <ResumeSection label="Summary" section={result.summary} />

        {result.experience.map((entry, i) => (
          <ExperienceSection key={`${entry.company}-${entry.title}-${i}`} entry={entry} />
        ))}

        <ResumeSection label="Skills" section={result.skills} />
      </div>
      <div className='align-self: flex-start'>
        <DownloadButton result={result} filename={downloadFilename} />
      </div>
    </section>
  )
}