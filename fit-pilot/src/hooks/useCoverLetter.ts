import { useCallback, useEffect, useRef, useState } from 'react'
import { callAI } from '@/lib/ai/client'
import { parseAIJson } from '@/lib/ai/parseJson'
import { buildCoverLetterUserMessage, COVER_LETTER_PROMPT_V1 } from '@/lib/ai/prompts'
import { serializeRewriteResult } from '@/lib/ai/serialize'
import type { CoverLetter, CoverLetterTone } from '@/types/ai'
import type { RewriteResult } from '@/types/ai'
import { getApiKey } from '@/lib/ai/providers/apiKey'
import { ACTIVE_PROVIDER } from '@/lib/ai/providers'
import { HAS_BACKEND } from '@/lib/config'

export type CoverLetterStatus = 'idle' | 'streaming' | 'complete' | 'error'

export function useCoverLetter() {
  const [status, setStatus] = useState<CoverLetterStatus>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [result, setResult] = useState<CoverLetter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus('idle')
    setStreamingText('')
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus('idle')
    setStreamingText('')
    setResult(null)
    setError(null)
  }, [])

  const generate = useCallback(
    async (rewriteResult: RewriteResult, jobDescription: string, tone: CoverLetterTone) => {
      const apiKey = HAS_BACKEND ? '' : getApiKey(ACTIVE_PROVIDER);
      if (!HAS_BACKEND && !apiKey) {
        setStatus('error')
        setError(`Missing ${ACTIVE_PROVIDER} key`)
        return
      }

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setStatus('streaming')
      setStreamingText('')
      setResult(null)
      setError(null)

      const rewrittenResume = serializeRewriteResult(rewriteResult)
      const prompt = COVER_LETTER_PROMPT_V1.replaceAll('{tone}', tone)

      try {
        const fullText = await callAI({
          apiKey,
          systemPrompt: prompt,
          messages: [{ role: 'user', content: buildCoverLetterUserMessage(rewrittenResume, jobDescription) }],
          signal: controller.signal,
          onToken: token => {
            setStreamingText(prev => prev + token)
          },
        })

        const parsed = parseAIJson<CoverLetter>(fullText)
        setResult({ ...parsed, tone })
        setStatus('complete')
        setStreamingText('')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Cover letter generation failed')
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null
        }
      }
    },
    []
  )

  return { status, streamingText, result, error, generate, cancel, reset }
}
