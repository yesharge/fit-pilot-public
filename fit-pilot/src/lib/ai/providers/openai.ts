import type { AIMessage, AIRequestOptions } from "@/types/ai";
import type { AIProvider } from "./types";

export const openaiProvider: AIProvider = {
    name: "openai",
    defaultModel: "gpt-4o",
    async call(systemPrompt: string, messages: AIMessage[], options: AIRequestOptions): Promise<Response> {
        return fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${options.apiKey}`,
            },
            body: JSON.stringify({
                model: options.model,
                max_tokens: options.maxTokens,
                stream: options.stream,
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
            }),
            signal: options.signal
        })
    },
    parseStreamChunk(data: string): string | null {
        if (data === '[DONE]') return null
        try {
          const event = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[]
          }
          return event.choices?.[0]?.delta?.content ?? null
        } catch {
          return null
        }
      },
}