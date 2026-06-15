import type { ColumnId } from '@/types/job'

export const COLUMN_ORDER: ColumnId[] = ['interested', 'reviewing', 'skipped']

export const COLUMN_LABELS: Record<ColumnId, string> = {
  interested: 'Interested',
  reviewing: 'Reviewing',
  skipped: 'Skipped',
}
