---
phase: 3
slug: voice-interview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), pytest (Python agent) |
| **Config file** | `vitest.config.ts` (existing), `pytest.ini` (new for agent) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && cd agent && python -m pytest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run full suite (frontend + agent)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | WEBR-06 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | WEBR-01 | T-03-01 | Token validated before room join | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | WEBR-02 | — | N/A | unit | `python -m pytest` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | WEBR-03 | — | N/A | unit | `python -m pytest` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | WEBR-04 | — | N/A | unit | `python -m pytest` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 2 | WEBR-08 | — | N/A | unit | `python -m pytest` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | WEBR-05 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | WEBR-07 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 3 | DASH-05 | — | N/A | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/interview/` — test directory for interview room components
- [ ] `agent/tests/` — test directory for Python agent
- [ ] `agent/tests/conftest.py` — shared fixtures (mock Supabase, mock LiveKit)
- [ ] `pytest` — install in agent requirements.txt

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice conversation quality | WEBR-02, WEBR-03 | Requires actual STT/LLM/TTS pipeline | Run a real interview, verify AI follows research brief and generates adaptive follow-ups |
| Mic check lobby UX | WEBR-01 | Requires browser mic permission | Open /interview/[token] in browser, verify mic level visualization, device selector |
| Audio recording via Egress | WEBR-06 | Requires LiveKit Cloud Egress | Complete an interview, verify recording appears in Supabase Storage |
| Orb state visualization | DASH-05 | Visual quality — CSS animation timing | Observe orb during interview: verify idle/listening/thinking/speaking states are visually distinct |
| Mobile WebRTC | WEBR-01 | Device-specific testing | Test on iOS Safari and Android Chrome |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
