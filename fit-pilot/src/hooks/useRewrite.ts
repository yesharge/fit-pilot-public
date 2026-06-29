import { useCallback, useEffect, useRef, useState } from 'react'
import { callAI } from '@/lib/ai/client'
import { parseAIJson } from '@/lib/ai/parseJson'
import { buildUserMessage, REWRITE_PROMPT_V3 } from '@/lib/ai/prompts'
import { ACTIVE_PROVIDER } from '@/lib/ai/providers'
import type { CoverLetterTone, RewriteResult } from '@/types/ai'
import { getApiKey } from '@/lib/ai/providers/apiKey'
import { HAS_BACKEND } from '@/lib/config'
import { useCoverLetter } from '@/hooks/useCoverLetter'

export type RewriteStatus = 'idle' | 'streaming' | 'complete' | 'error'

export interface RewriteOptions {
  generateCoverLetter?: boolean
  coverLetterTone?: CoverLetterTone
}

export function useRewrite() {
  const coverLetter = useCoverLetter()
  const [status, setStatus] = useState<RewriteStatus>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [result, setResult] = useState<RewriteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Holds the controller for the in-flight rewrite, if any. Owned here because
  // only one rewrite runs at a time (the slide-over is singular). A new call
  // aborts the previous one so leftover tokens never bleed into fresh state.
  const controllerRef = useRef<AbortController | null>(null)

  // Abort any in-flight stream if the component unmounts mid-rewrite.
  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])
  
  const cancel = useCallback(() => {
    // User-initiated stop. Abort the fetch and return to idle silently.
    // A cancel is not an error and must not land in the error UI.
    controllerRef.current?.abort()
    controllerRef.current = null
    coverLetter.cancel()
    setStatus('idle')
    setStreamingText('')
  }, [coverLetter.cancel])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus('idle')
    setStreamingText('')
    setResult(null)
    setError(null)
    coverLetter.reset()
  }, [coverLetter.reset])

  const rewrite = useCallback(async (
    resumeText: string,
    jobDescription: string,
    options?: RewriteOptions,
  ) => {
    const apiKey = HAS_BACKEND ? '' : getApiKey("anthropic");

    if (!HAS_BACKEND && !apiKey) {
      setStatus('error')
      setError(`No API key set for ${ACTIVE_PROVIDER}. Add one to continue.`)
      return
    }

    // Abort a previous rewrite still in flight before starting a new one.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setStatus('streaming')
    setStreamingText('')
    setResult(null)
    setError(null)

    const systemPrompt = REWRITE_PROMPT_V3

    try {
      const fullText = await callAI({
        systemPrompt,
        messages: [{ role: 'user', content: buildUserMessage(resumeText, jobDescription) }],
        apiKey,
        signal: controller.signal,
        onToken: token => {
          setStreamingText(prev => prev + token)
        },
      })

      const parsed = parseAIJson<RewriteResult>(fullText)
      setResult(parsed)
      setStatus('complete')
      setStreamingText('')

      if (options?.generateCoverLetter) {
        await coverLetter.generate(
          parsed,
          jobDescription,
          options.coverLetterTone ?? 'formal',
        )
      }
    } catch (err) {
      // An aborted fetch throws AbortError. That's a user cancel (or unmount),
      // already handled by cancel()/reset(), don't surface it as a failure.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Rewrite failed')
    } finally {
        // Clear the ref only if this call still owns it. If a newer rewrite has
        // already replaced it, leave that one alone.
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
    }
  }, [coverLetter.generate])

  return {
    status,
    streamingText,
    result,
    error,
    rewrite,
    cancel,
    reset,
    coverLetterStatus: coverLetter.status,
    coverLetterStreamingText: coverLetter.streamingText,
    coverLetterResult: coverLetter.result,
    coverLetterError: coverLetter.error,
    generateCoverLetter: coverLetter.generate,
    resetCoverLetter: coverLetter.reset,
  }
}
