import { serializeRewriteResult } from '@/lib/ai/serialize'
import { extractKeywords, wordsOf } from '@/lib/keywords'
import type { RewriteResult } from '@/types/ai'
import styles from './KeywordCoverage.module.css'

interface KeywordCoverageProps {
  jobDescription: string
  result: RewriteResult
}

export function KeywordCoverage({ jobDescription, result }: KeywordCoverageProps) {
  const rewrittenWords = wordsOf(serializeRewriteResult(result))
  const keywords = extractKeywords(jobDescription)

  if (keywords.length === 0) return null

  const covered = new Set(
    keywords.filter(kw => rewrittenWords.has(kw.toLowerCase()))
  )
  const coveragePct = Math.round((covered.size / keywords.length) * 100)

  return (
    <section className={styles.coverage} aria-label="Keyword coverage">
      <div className={styles.header}>
        <h3 className={styles.heading}>Keyword coverage</h3>
        <span className={styles.score}>
          {covered.size} / {keywords.length} matched · {coveragePct}%
        </span>
      </div>

      <ul className={styles.list}>
        {keywords.map(keyword => {
          const isCovered = covered.has(keyword)
          return (
            <li
              key={keyword}
              className={`${styles.item} ${isCovered ? styles.itemCovered : styles.itemMissing}`}
            >
              {isCovered ? '✓' : '○'} {keyword}
            </li>
          )
        })}
      </ul>
    </section>
  )
}