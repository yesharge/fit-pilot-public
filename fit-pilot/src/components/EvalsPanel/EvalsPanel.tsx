import { useMemo, useState } from 'react'
import { buildEvalDataset } from '@/lib/evalDataset'
import { downloadJson } from '@/lib/download'
import { NEGATIVE_OUTCOMES, POSITIVE_OUTCOMES } from '@/lib/applicationStatus'
import type { Job } from '@/types/job'
import styles from './EvalsPanel.module.css'

const BUCKETS = [
  { label: '0–19', min: 0, max: 19 },
  { label: '20–39', min: 20, max: 39 },
  { label: '40–59', min: 40, max: 59 },
  { label: '60–79', min: 60, max: 79 },
  { label: '80–100', min: 80, max: 100 },
]

interface EvalsPanelProps {
  jobs: Job[]
}

export function EvalsPanel({ jobs }: EvalsPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const dataset = useMemo(() => buildEvalDataset(jobs), [jobs])

  const decided = dataset.filter(
    e =>
      typeof e.fitScore === 'number' &&
      (POSITIVE_OUTCOMES.includes(e.outcome) || NEGATIVE_OUTCOMES.includes(e.outcome))
  )

  const buckets = BUCKETS.map(b => {
    let pos = 0
    let neg = 0
    for (const e of decided) {
      const s = e.fitScore as number
      if (s < b.min || s > b.max) continue
      if (POSITIVE_OUTCOMES.includes(e.outcome)) pos++
      else neg++
    }
    return { ...b, pos, neg }
  })

  const maxCount = Math.max(1, ...buckets.map(b => Math.max(b.pos, b.neg)))
  const posTotal = decided.filter(e => POSITIVE_OUTCOMES.includes(e.outcome)).length
  const negTotal = decided.length - posTotal

  const W = 360
  const H = 164
  const padL = 26
  const padR = 8
  const padT = 8
  const padB = 24
  const plotH = H - padT - padB
  const baseY = padT + plotH
  const groupW = (W - padL - padR) / BUCKETS.length
  const barW = Math.min(15, groupW / 3)
  const gap = 3

  // No applications at all → don't render the panel.
  if (dataset.length === 0) return null

  return (
    <section className={styles.panel} aria-label="Evals">
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          <span className={styles.chevron} aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className={styles.title}>Evals</span>
          <span className={styles.count}>
            {posTotal + negTotal} tagged
          </span>
        </button>

        <button
          type="button"
          className={styles.infoBtn}
          onClick={() => setShowInfo(v => !v)}
          aria-label="What are evals?"
          aria-pressed={showInfo}
        >
          i
        </button>

        {expanded && (
          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => downloadJson(dataset, 'fitpilot-eval-dataset.json')}
          >
            Export eval data (JSON)
          </button>
        )}
      </div>

      {showInfo && (
        <p className={styles.info}>
          Evals measure whether higher fit scores actually lead to better
          outcomes. As you tag applications (interview, offer, rejected,
          ghosted), this compares the fit-score distribution of positive vs
          negative results — your ground-truth signal for tuning the scoring
          bounds and the rewrite prompt. Export the data as JSON for deeper
          analysis.
        </p>
      )}

      {expanded &&
        (decided.length === 0 ? (
          <p className={styles.empty}>
            Tag application outcomes (interview, offer, rejected, ghosted) to see
            the fit-score distribution here.
          </p>
        ) : (
          <>
            <p className={styles.subtitle}>
              Fit score vs outcome — {posTotal} positive, {negTotal} negative
            </p>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className={styles.chart}
              role="img"
              aria-label="Fit score distribution by outcome"
            >
              <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="var(--border)" />
              <text x={padL - 6} y={baseY} textAnchor="end" dominantBaseline="middle" className={styles.axis}>
                0
              </text>
              <text x={padL - 6} y={padT + 4} textAnchor="end" dominantBaseline="middle" className={styles.axis}>
                {maxCount}
              </text>

              {buckets.map((b, i) => {
                const center = padL + i * groupW + groupW / 2
                const posH = (b.pos / maxCount) * plotH
                const negH = (b.neg / maxCount) * plotH
                return (
                  <g key={b.label}>
                    <rect
                      x={center - barW - gap / 2}
                      y={baseY - posH}
                      width={barW}
                      height={posH}
                      rx="1"
                      fill="var(--success-text)"
                    />
                    <rect
                      x={center + gap / 2}
                      y={baseY - negH}
                      width={barW}
                      height={negH}
                      rx="1"
                      fill="var(--error-text)"
                    />
                    <text x={center} y={baseY + 14} textAnchor="middle" className={styles.axis}>
                      {b.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            <div className={styles.footer}>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchPos}`} aria-hidden="true" />
                Interview / offer
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.swatch} ${styles.swatchNeg}`} aria-hidden="true" />
                Rejected / ghosted
              </span>
              <span className={styles.axisCaption}>Fit score (%)</span>
            </div>
          </>
        ))}
    </section>
  )
}
