import { useState } from 'react'
import type { ManualJobFields } from '@/hooks/useJobSearch'
import styles from './ManualJobInput.module.css'

interface ManualJobInputProps {
  onSubmit: (fields: ManualJobFields) => void
}

export function ManualJobInput({ onSubmit }: ManualJobInputProps) {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedCompany = company.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle || !trimmedCompany || !trimmedDescription) return

    onSubmit({
      title: trimmedTitle,
      company: trimmedCompany,
      description: trimmedDescription,
    })

    setTitle('')
    setCompany('')
    setDescription('')
  }

  const canSubmit =
    title.trim().length > 0 &&
    company.trim().length > 0 &&
    description.trim().length > 0

  return (
    <div className={styles.manualJobInput}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="manual-job-title">Title</label>
            <input
              id="manual-job-title"
              type="text"
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="manual-job-company">Company</label>
            <input
              id="manual-job-company"
              type="text"
              className={styles.input}
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="manual-job-description">Description</label>
            <textarea
              id="manual-job-description"
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Paste the job description here…"
              rows={8}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
          Add job
        </button>
      </form>
    </div>
  )
}