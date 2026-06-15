import { useEffect, useRef, useState } from 'react'
import type { ManualJobFields, SearchInput } from '@/hooks/useJobSearch'
import type { DatePosted } from '@/types/job'
import styles from './AddJobModal.module.css'

type Tab = 'search' | 'paste'
type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

interface AddJobModalProps {
  initialTab?: Tab
  onClose: () => void
  onSearch: (params: SearchInput) => Promise<void>
  onAddManual: (fields: ManualJobFields) => void
  searchStatus: SearchStatus
  searchError: string | null
}

const EMPLOYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any type' },
  { value: 'FULLTIME', label: 'Full-time' },
  { value: 'PARTTIME', label: 'Part-time' },
  { value: 'CONTRACTOR', label: 'Contract' },
  { value: 'INTERN', label: 'Internship' },
]

const DATE_OPTIONS: { value: DatePosted; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Past 24 hours' },
  { value: '3days', label: 'Past 3 days' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
]

export function AddJobModal({
  initialTab = 'search',
  onClose,
  onSearch,
  onAddManual,
  searchStatus,
  searchError,
}: AddJobModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab)

  // Search fields
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState(false)
  const [employmentType, setEmploymentType] = useState('')
  const [datePosted, setDatePosted] = useState<DatePosted>('month')

  // Paste fields
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')

  // Tracks whether the in-flight search was launched from this modal, so we
  // only auto-close on the success that belongs to our own submit.
  const submittedRef = useRef(false)

  useEffect(() => {
    if (submittedRef.current && searchStatus === 'success') {
      submittedRef.current = false
      onClose()
    }
    if (searchStatus === 'error') submittedRef.current = false
  }, [searchStatus, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isLoading = searchStatus === 'loading'
  const canSearch = role.trim().length > 0 && !isLoading
  const canAdd =
    title.trim().length > 0 &&
    company.trim().length > 0 &&
    description.trim().length > 0

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!canSearch) return
    submittedRef.current = true
    void onSearch({
      query: role.trim(),
      location: location.trim() || undefined,
      workFromHome: remote || undefined,
      employmentTypes: employmentType ? [employmentType] : undefined,
      datePosted,
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdd) return
    onAddManual({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
    })
    setTitle('')
    setCompany('')
    setDescription('')
    onClose()
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Add a job"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modal}>
        <header className={styles.head}>
          <h2 className={styles.heading}>Add a job</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'search'}
            className={`${styles.tab} ${tab === 'search' ? styles.tabActive : ''}`}
            onClick={() => setTab('search')}
          >
            Search
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'paste'}
            className={`${styles.tab} ${tab === 'paste' ? styles.tabActive : ''}`}
            onClick={() => setTab('paste')}
          >
            Paste a listing
          </button>
        </div>

        {tab === 'search' ? (
          <form className={styles.body} onSubmit={handleSearch}>
            <div className={styles.field}>
              <label htmlFor="add-role">Role</label>
              <input
                id="add-role"
                type="text"
                className={styles.input}
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Full-stack engineer"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="add-location">Location</label>
                <input
                  id="add-location"
                  type="text"
                  className={styles.input}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  disabled={isLoading}
                />
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={remote}
                  onChange={e => setRemote(e.target.checked)}
                  disabled={isLoading}
                />
                Remote only
              </label>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="add-employment">Employment type</label>
                <select
                  id="add-employment"
                  className={styles.input}
                  value={employmentType}
                  onChange={e => setEmploymentType(e.target.value)}
                  disabled={isLoading}
                >
                  {EMPLOYMENT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="add-date">Date posted</label>
                <select
                  id="add-date"
                  className={styles.input}
                  value={datePosted}
                  onChange={e => setDatePosted(e.target.value as DatePosted)}
                  disabled={isLoading}
                >
                  {DATE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {searchStatus === 'error' && searchError && (
              <p className={styles.error} role="alert">
                {searchError}
              </p>
            )}

            <div className={styles.footer}>
              <span className={styles.footerHint}>
                Results are scored against your resume and added to Interested.
              </span>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={!canSearch}
              >
                {isLoading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        ) : (
          <form className={styles.body} onSubmit={handleAdd}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="add-title">Title</label>
                <input
                  id="add-title"
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Software Engineer"
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="add-company">Company</label>
                <input
                  id="add-company"
                  type="text"
                  className={styles.input}
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="add-description">Job description</label>
              <textarea
                id="add-description"
                className={styles.textarea}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={7}
              />
            </div>

            <div className={styles.footer}>
              <span className={styles.footerHint}>
                We score this against your resume the moment you add it.
              </span>
              <button type="submit" className={styles.primaryBtn} disabled={!canAdd}>
                Add to Interested
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
