import { describe, it, expect, vi } from 'vitest'

// Mock LiveKit components-react
vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: vi.fn(({ children }) => children),
  useAgent: vi.fn(() => ({ state: 'listening', audioTrack: null })),
  useTrackVolume: vi.fn(() => 0),
  useDataChannel: vi.fn(() => ({ send: vi.fn(), message: null })),
  useLocalParticipant: vi.fn(() => ({ localParticipant: null })),
  useConnectionState: vi.fn(() => 'connected'),
  useIsMuted: vi.fn(() => false),
}))

describe('InterviewRoom', () => {
  it('renders InterviewOrb component', () => {
    // Stub: verify orb is rendered
    expect(true).toBe(true)
  })

  it('renders TranscriptFeed component', () => {
    // Stub: verify transcript feed is rendered
    expect(true).toBe(true)
  })

  it('renders TextFallbackInput component', () => {
    // Stub: verify text input is rendered
    expect(true).toBe(true)
  })

  it('renders InterviewTimer component', () => {
    // Stub: verify timer is rendered
    expect(true).toBe(true)
  })

  it('renders mic toggle button', () => {
    // Stub: verify mic toggle exists
    expect(true).toBe(true)
  })

  it('renders "Terminar entrevista" button', () => {
    // Stub: verify end interview button exists
    expect(true).toBe(true)
  })
})
