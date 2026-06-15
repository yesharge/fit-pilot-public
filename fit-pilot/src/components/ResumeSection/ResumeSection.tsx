import type { DiffSection, ExperienceEntry } from '@/types/ai'
import styles from './ResumeSection.module.css'

interface ResumeSectionProps {
  label: string
  section: DiffSection
}

/** One prose section (summary, skills) rendered as an original/rewritten cell pair. */
export function ResumeSection({ label, section }: ResumeSectionProps) {
  return (
    <>
      <div className={`${styles.cell} ${styles.original}`}>
        <h4 className={styles.cellLabel}>{label}</h4>
        <p className={styles.text}>
          {section.original || <em className={styles.empty}>—</em>}
        </p>
      </div>
      <div className={`${styles.cell} ${section.changed ? styles.changed : ''}`}>
        <h4 className={styles.cellLabel}>{label}</h4>
        <p className={styles.text}>{section.rewritten}</p>
        {section.changed && section.note && <WhyNote note={section.note} />}
      </div>
    </>
  )
}

interface ExperienceSectionProps {
  entry: ExperienceEntry
}

/** One experience entry rendered as an original/rewritten cell pair. */
export function ExperienceSection({ entry }: ExperienceSectionProps) {
  const header = `${entry.title} — ${entry.company} (${entry.dates})`
  return (
    <>
      <div className={`${styles.cell} ${styles.original}`}>
        <p className={styles.role}>{header}</p>
        <ul className={styles.bullets}>
          {entry.original.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      <div className={`${styles.cell} ${entry.changed ? styles.changed : ''}`}>
        <p className={styles.role}>{header}</p>
        <ul className={styles.bullets}>
          {entry.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        {entry.changed && entry.note && <WhyNote note={entry.note} />}
      </div>
    </>
  )
}

function WhyNote({ note }: { note: string }) {
  return (
    <details className={styles.why}>
      <summary className={styles.whySummary}>Why this changed</summary>
      <p className={styles.whyBody}>{note}</p>
    </details>
  )
}