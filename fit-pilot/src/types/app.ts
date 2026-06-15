import type { RewriteResult } from "./ai"

export type AppStatus = 'idle' | 'streaming' | 'complete' | 'error'

export interface AppState {
    status: AppStatus
    result: RewriteResult | null
    streamingText: string
    error: string | null
}