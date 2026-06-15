import type { AIMessage, AIRequestOptions } from "@/types/ai"
import type { AIProvider } from "./types"
import { APP_TOKEN, HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config"

export const anthropicProvider: AIProvider = {
  name: 'anthropic',
  defaultModel: 'claude-sonnet-4-6',
  async call(
      systemPrompt: string,
      messages: AIMessage[],
      options: AIRequestOptions,
  ): Promise<Response> {
    const body = JSON.stringify({
      model: options.model || this.defaultModel,
      max_tokens: options.maxTokens,
      stream: options.stream,
      system: systemPrompt,
      messages,
    })

    // Backend mode: the `anthropic` edge function injects the key and streams
    // the response back. Client mode: hit the Anthropic API via the Vite dev
    // proxy with the user's own key.
    if (HAS_BACKEND) {
      return fetch(`${SUPABASE_URL}/functions/v1/anthropic`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}),
        },
        body,
        signal: options.signal,
      })
    }

    return fetch('/api-anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body,
      signal: options.signal,
    })
  },

  parseStreamChunk(data: string): string | null {
      try {
          const event = JSON.parse(data) as {
              type?: string
              delta?: {type?: string; text?: string}
          }
          if (
              event.type === 'content_block_delta' &&
              event.delta?.type === 'text_delta' &&
              event.delta.text
          ) {
              return event.delta.text
          }
          return null
      } catch {
          return null
      }
  }
}
  