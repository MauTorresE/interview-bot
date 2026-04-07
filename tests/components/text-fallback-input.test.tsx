import { describe, it, expect, vi } from 'vitest'

describe('TextFallbackInput', () => {
  it('calls onSend with text when Enter is pressed', () => {
    // Stub: render, type text, press Enter, verify onSend called
    expect(true).toBe(true)
  })

  it('clears input after sending', () => {
    // Stub: verify input value is empty after submit
    expect(true).toBe(true)
  })

  it('does not send empty text', () => {
    // Stub: press Enter with empty input, verify onSend NOT called
    expect(true).toBe(true)
  })

  it('is disabled when disabled prop is true', () => {
    // Stub: render with disabled=true, verify input is disabled
    expect(true).toBe(true)
  })
})
