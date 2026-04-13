'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * useInterviewPresence — Wave 3.3
 *
 * Manages two mobile-critical concerns for interview sessions:
 *
 * 1. **Wake Lock** — prevents the screen from dimming/locking during the
 *    interview. Uses the Screen Wake Lock API (Chrome 84+, Safari 16.4+).
 *    Automatically re-acquires after visibility restore (iOS drops it on
 *    tab background).
 *
 * 2. **Visibility tracking** — detects when the tab is backgrounded (user
 *    switches apps, screen locks, phone call interrupts). The interview
 *    room renders a <BackgroundedOverlay> when isBackgrounded is true.
 *
 * Both features degrade gracefully: if the browser doesn't support Wake Lock,
 * we just don't acquire it. If visibility API isn't available, we never flag
 * backgrounded.
 */
export function useInterviewPresence() {
  const [isBackgrounded, setIsBackgrounded] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // Wake lock not supported or denied — degrade gracefully
    }
  }

  useEffect(() => {
    acquireWakeLock()

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        setIsBackgrounded(true)
      } else {
        setIsBackgrounded(false)
        // Re-acquire wake lock after returning to foreground (iOS drops it)
        acquireWakeLock()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  return { isBackgrounded }
}
