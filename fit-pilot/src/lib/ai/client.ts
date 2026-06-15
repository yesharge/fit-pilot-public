import type { AIMessage, AIRequestOptions } from "@/types/ai"
import { providers, ACTIVE_PROVIDER } from "./providers"

export interface CallAIOptions {
  systemPrompt: string
  messages: AIMessage[]
  apiKey: string
  maxTokens?: number
  onToken?: (text: string) => void
  /** Forwarded to the provider's fetch so an in-flight stream can be aborted. */
  signal?: AbortSignal
}

export async function callAI({
  systemPrompt,
  messages,
  apiKey,
  onToken,
  maxTokens = 4096,
  signal
}: CallAIOptions): Promise<string> {
  const provider = providers[ACTIVE_PROVIDER]

  if (!provider) {
    throw new Error(`Unknown provider: ${ACTIVE_PROVIDER}`)
  }

  const options: AIRequestOptions = { model: provider.defaultModel, maxTokens, stream: true, apiKey, signal }
  const response = await provider.call(systemPrompt, messages, options)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`AI request failed (${response.status}): ${body}`)
  }

  if (!response.body) {
    throw new Error('AI response had no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()

      const token = provider.parseStreamChunk(data)
      if (token) {
        fullText += token
        onToken?.(token)
      }
    }
  }

  return fullText
}
