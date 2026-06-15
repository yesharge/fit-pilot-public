import { useMemo, useRef, useState } from 'react'
import { JobCard } from '@/components/JobCard/JobCard'
import { COLUMN_LABELS, COLUMN_ORDER } from '@/lib/jobColumns'
import type { ColumnId, Job } from '@/types/job'
import styles from './JobQueue.module.css'

interface JobQueueProps {
  jobs: Job[]
  onOpen: (job: Job) => void
  onMove: (id: string, column: ColumnId) => void
}

export function JobQueue({ jobs, onOpen, onMove }: JobQueueProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null)
  const draggedJobIdRef = useRef<string | null>(null)

  const jobsByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Job[]> = {
      interested: [],
      reviewing: [],
      skipped: [],
    }

    for (const job of jobs) {
      grouped[job.column].push(job)
    }

    return grouped
  }, [jobs])

  function handleDragStart(jobId: string) {
    draggedJobIdRef.current = jobId
  }

  function handleDragEnd() {
    draggedJobIdRef.current = null
    setDragOverColumn(null)
  }

  function handleDragOver(e: React.DragEvent, column: ColumnId) {
    e.preventDefault()
    setDragOverColumn(column)
  }

  function handleDragLeave() {
    setDragOverColumn(null)
  }

  function handleDrop(e: React.DragEvent, column: ColumnId) {
    e.preventDefault()
    const jobId = draggedJobIdRef.current
    if (jobId) onMove(jobId, column)
    draggedJobIdRef.current = null
    setDragOverColumn(null)
  }

  if (jobs.length === 0) return null

  return (
    <div className={styles.jobQueue} aria-label="Job review queue">
      {COLUMN_ORDER.map(column => {
        const columnJobs = jobsByColumn[column]
        const isDragOver = dragOverColumn === column

        return (
          <section
            key={column}
            className={`${styles.column} ${isDragOver ? styles.columnDragOver : ''}`}
            aria-label={`${COLUMN_LABELS[column]} column`}
            onDragOver={e => handleDragOver(e, column)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, column)}
          >
            <h3 className={styles.columnHeader}>
              {COLUMN_LABELS[column]} ({columnJobs.length})
            </h3>

            <ul className={styles.cardList}>
              {columnJobs.map(job => (
                <li
                  key={job.id}
                  draggable
                  onDragStart={() => handleDragStart(job.id)}
                  onDragEnd={handleDragEnd}
                >
                  <JobCard job={job} onOpen={onOpen} />
                </li>
              ))}
            </ul>

            {columnJobs.length === 0 && (
              <p className={styles.emptyColumn}>Drop jobs here</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
