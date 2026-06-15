import { useState } from 'react'
import styles from './ApiKeyInput.module.css'

type Provider = 'anthropic' | 'openai' | 'jsearch'

interface ApiKeyInputProps {
  provider: Provider
  onKeyChange?: (key: string) => void
}

const LABELS: Record<Provider, string> = {
  anthropic: 'Anthropic API key',
  openai: 'OpenAI API key',
  jsearch: 'JSearch (RapidAPI) key',
}

const PLACEHOLDERS: Record<Provider, string> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  jsearch: 'RapidAPI key',
}

function storageKey(provider: Provider): string {
  return `fitpilot_key_${provider}`
}

export function ApiKeyInput({ provider, onKeyChange }: ApiKeyInputProps) {
  const initial = sessionStorage.getItem(storageKey(provider)) ?? ''
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial.length > 0)

  function handleChange(next: string) {
    setValue(next)
    setSaved(false)
    if (next) {
      sessionStorage.setItem(storageKey(provider), next)
    } else {
      sessionStorage.removeItem(storageKey(provider))
    }
    onKeyChange?.(next)
    setSaved(next.length > 0)
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>{LABELS[provider]}</span>
      <input
        type="password"
        className={styles.input}
        value={value}
        placeholder={PLACEHOLDERS[provider]}
        onChange={e => handleChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <span className={styles.hint}>
        {saved
          ? 'Stored for this session only.'
          : 'Paste your key. It stays in this browser tab.'}
      </span>
    </label>
  )
}