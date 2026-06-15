import { anthropicProvider } from "./anthropic"
import { openaiProvider } from "./openai"
import type { AIProvider } from "./types"

export type ProviderName = 'anthropic' | 'openai'

export const providers: Record<ProviderName, AIProvider> = {
    anthropic: anthropicProvider,
    openai: openaiProvider,
}

function resolveProvider(): ProviderName {
    const stored = localStorage.getItem('fitpilot_provider')
    return stored === 'openai' || stored === 'anthropic' ? stored : 'anthropic'
  }
  
export const ACTIVE_PROVIDER: ProviderName = resolveProvider()