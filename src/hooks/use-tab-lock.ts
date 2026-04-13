'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

/**
 * useTabLock — Wave 4.1
 *
 * Prevents the same interview from being open in multiple browser tabs
 * simultaneously. Two tabs sending audio to the same LiveKit room causes
 * echo, duplicate transcripts, and race conditions on state transitions.
 *
 * Uses BroadcastChannel + localStorage for cross-tab coordination:
 * - localStorage: persistent lock with heartbeat (3s interval, 10s stale)
 * - BroadcastChannel: instant take-control messaging between tabs
 *
 * Returns { status, takeover } where:
 * - status='acquiring': checking for existing lock
 * - status='owner': this tab owns the lock
 * - status='locked_by_other': another tab has the lock
 *
 * The takeover() function lets the user explicitly take control in this tab,
 * sending a BroadcastChannel message that makes the other tab yield.
 */
export function useTabLock(inviteToken: string) {
  const tabId = useMemo(() => crypto.randomUUID(), [])
  const [status, setStatus] = useState<'acquiring' | 'owner' | 'locked_by_other'>('acquiring')

  const takeover = useCallback(() => {
    try {
      const channel = new BroadcastChannel(`interview-${inviteToken}`)
      channel.postMessage({ type: 'take_control', tabId })
      channel.close()
    } catch { /* BroadcastChannel not supported */ }

    const lockKey = `interview-tablock-${inviteToken}`
    localStorage.setItem(lockKey, JSON.stringify({
      tabId,
      acquiredAt: Date.now(),
      heartbeatAt: Date.now(),
    }))
    setStatus('owner')
  }, [inviteToken, tabId])

  useEffect(() => {
    const lockKey = `interview-tablock-${inviteToken}`
    let channel: BroadcastChannel | null = null
    let hbInterval: ReturnType<typeof setInterval> | null = null

    // Check for existing lock
    try {
      const raw = localStorage.getItem(lockKey)
      if (raw) {
        const existing = JSON.parse(raw)
        if (existing && existing.tabId !== tabId) {
          const age = Date.now() - existing.heartbeatAt
          if (age < 10_000) {
            // Another tab is actively holding the lock
            setStatus('locked_by_other')

            // Listen for take_control or release messages
            try {
              channel = new BroadcastChannel(`interview-${inviteToken}`)
              channel.onmessage = (ev) => {
                if (ev.data?.type === 'take_control' && ev.data.tabId === tabId) {
                  // We're being given control
                  setStatus('owner')
                } else if (ev.data?.type === 'released') {
                  // Other tab released — try to acquire
                  setStatus('acquiring')
                }
              }
            } catch { /* BroadcastChannel not supported */ }
            return
          }
          // Stale lock — fall through to acquire
        }
      }
    } catch { /* ignore */ }

    // Acquire the lock
    const writeLock = () => {
      localStorage.setItem(lockKey, JSON.stringify({
        tabId,
        acquiredAt: Date.now(),
        heartbeatAt: Date.now(),
      }))
    }
    writeLock()
    setStatus('owner')

    // Heartbeat: keep the lock alive every 3s
    hbInterval = setInterval(writeLock, 3000)

    // Listen for take_control from other tabs
    try {
      channel = new BroadcastChannel(`interview-${inviteToken}`)
      channel.onmessage = (ev) => {
        if (ev.data?.type === 'take_control' && ev.data.tabId !== tabId) {
          // Another tab is taking over — yield
          if (hbInterval) clearInterval(hbInterval)
          hbInterval = null
          setStatus('locked_by_other')
        }
      }
    } catch { /* BroadcastChannel not supported */ }

    return () => {
      if (hbInterval) clearInterval(hbInterval)
      try {
        const current = localStorage.getItem(lockKey)
        if (current) {
          const parsed = JSON.parse(current)
          if (parsed?.tabId === tabId) {
            localStorage.removeItem(lockKey)
            // Notify other tabs we released
            if (channel) {
              channel.postMessage({ type: 'released' })
            }
          }
        }
      } catch { /* ignore */ }
      if (channel) channel.close()
    }
  }, [inviteToken, tabId])

  return { status, takeover }
}
