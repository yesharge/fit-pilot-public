import { ACTIVE_PROVIDER, type ProviderName } from '@/lib/ai/providers'

const DEV_ENV_KEYS: Record<ProviderName, string | undefined> = {
  anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
  openai: import.meta.env.VITE_OPENAI_API_KEY,
}

export function keyStorageKey(name: string): string {
  return `fitpilot_key_${name}`
}

/**
 * Resolves the API key for a provider.
 * - Prefers a key the user entered (sessionStorage, via the Settings panel).
 * - Falls back to .env.local (VITE_*_API_KEY) in DEV so you don't paste keys
 *   every reload.
 * Defaults to the active provider.
 */
export function getApiKey(provider: ProviderName = ACTIVE_PROVIDER): string {
  const stored = sessionStorage.getItem(keyStorageKey(provider))
  if (stored) return stored
  if (import.meta.env.DEV) return DEV_ENV_KEYS[provider] ?? ''
  return ''
}

/**
 * JSearch (RapidAPI) key for job search. Not an AI provider, so it's tracked
 * separately, but follows the same entered-key-then-env-fallback rules.
 */
export function getJSearchKey(): string {
  const stored = sessionStorage.getItem(keyStorageKey('jsearch'))
  if (stored) return stored
  if (import.meta.env.DEV) return import.meta.env.VITE_JSEARCH_API_KEY ?? ''
  return ''
}
