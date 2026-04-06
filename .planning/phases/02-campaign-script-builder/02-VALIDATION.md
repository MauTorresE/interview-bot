---
phase: 2
slug: campaign-script-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (exists, jsdom environment, path aliases configured) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CAMP-01 | T-02-01 | RLS on campaigns table | unit | `npx vitest run tests/validations/campaign.test.ts -t "create"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | CAMP-02 | T-02-01 | RLS on campaigns table | unit | `npx vitest run tests/actions/campaign.test.ts -t "update"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | CAMP-03 | — | N/A | unit | `npx vitest run tests/components/campaign-grid.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | CONF-01, CONF-02 | — | N/A | unit | `npx vitest run tests/validations/campaign.test.ts -t "brief"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | CONF-06 | — | N/A | unit | `npx vitest run tests/components/brief-preview.test.tsx` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | RESP-01 | T-02-02 | Token non-enumerable | manual | Verify via Supabase SQL | — | ⬜ pending |
| 02-03-02 | 03 | 1 | RESP-03 | T-02-03 | Input validation | unit | `npx vitest run tests/validations/campaign.test.ts -t "respondent"` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 1 | RESP-05 | — | N/A | unit | `npx vitest run tests/components/consent-screen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/validations/campaign.test.ts` — stubs for CAMP-01, CONF-01/02, RESP-03 validation schemas
- [ ] `tests/components/campaign-grid.test.tsx` — stubs for CAMP-03 rendering
- [ ] `tests/components/brief-preview.test.tsx` — stubs for CONF-06 preview rendering
- [ ] `tests/components/consent-screen.test.tsx` — stubs for RESP-05 consent flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite token generation uses `gen_random_uuid()` | RESP-01 | DB-level default, not testable in unit tests | Run `SELECT id FROM respondents LIMIT 1` and verify UUID format |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
