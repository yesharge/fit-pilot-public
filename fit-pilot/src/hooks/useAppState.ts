import { useState } from 'react'
import type { AppState } from '@/types/app'
import type { RewriteResult } from '@/types/ai'


const initialState: AppState = {
    status: 'idle',
    result: null,
    streamingText: '',
    error: null,
  }

export function useAppState() {
    const [state, setState] = useState<AppState>(initialState)

    function startStreaming() {
        setState({ status: 'streaming', result: null, streamingText: '', error: null })
      }
    
      function appendToken(text: string) {
        setState(prev => ({ ...prev, streamingText: prev.streamingText + text }))
      }
    
      function setComplete(result: RewriteResult) {
        setState({ status: 'complete', result, streamingText: '', error: null })
      }
    
      function setError(error: string) {
        setState({ status: 'error', result: null, streamingText: '', error })
      }
    
      function reset() {
        setState(initialState)
      }

    return { state, startStreaming, appendToken, setComplete, setError, reset }
}