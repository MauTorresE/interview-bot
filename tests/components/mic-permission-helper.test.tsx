import { describe, it, expect } from 'vitest'
import { detectBrowser } from '@/components/interview/mic-permission-helper'

// Regression test for the bug where Chrome-on-macOS was misdetected as Safari
// (Chrome UA on macOS contains the legacy "Safari" substring). All detection
// paths from the helper are covered here so future reorderings can't reintroduce
// the false positive.
//
// UA strings are real captures from each browser + platform pair.
describe('detectBrowser', () => {
  const cases: Array<{ name: string; ua: string; expected: string }> = [
    {
      name: 'Chrome on macOS (regression: was detected as safari-mac)',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      expected: 'chrome',
    },
    {
      name: 'Chrome on Windows',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      expected: 'chrome',
    },
    {
      name: 'Chrome on iOS (CriOS)',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1',
      expected: 'chrome',
    },
    {
      name: 'Safari on macOS',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      expected: 'safari-mac',
    },
    {
      name: 'Safari on iOS',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      expected: 'safari-ios',
    },
    {
      name: 'Firefox on desktop',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
      expected: 'firefox',
    },
    {
      name: 'Firefox on iOS (FxiOS)',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/128.0 Mobile/15E148 Safari/605.1.15',
      expected: 'firefox',
    },
    {
      name: 'Edge on Windows',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
      expected: 'edge',
    },
    {
      name: 'Unknown UA falls back to other',
      ua: 'SomeFutureBrowser/1.0',
      expected: 'other',
    },
  ]

  for (const { name, ua, expected } of cases) {
    it(name, () => {
      expect(detectBrowser(ua)).toBe(expected)
    })
  }

  it('returns "other" when UA is undefined (SSR / no navigator)', () => {
    expect(detectBrowser(undefined)).toBe('other')
  })
})
