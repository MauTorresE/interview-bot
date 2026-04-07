'use client'

import { useState, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'

type TextFallbackInputProps = {
  onSend: (text: string) => void
  disabled?: boolean
}

export function TextFallbackInput({ onSend, disabled }: TextFallbackInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={`relative flex items-center h-12 rounded-lg border border-border bg-card ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Escribe tu respuesta..."
        aria-label="Escribe tu respuesta"
        className="h-full flex-1 bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex items-center justify-center px-3 h-full text-primary disabled:opacity-50"
        aria-label="Enviar mensaje"
      >
        <SendHorizontal className="size-5" />
      </button>
    </div>
  )
}
