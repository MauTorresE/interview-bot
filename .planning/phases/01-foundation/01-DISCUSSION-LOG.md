# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-Foundation
**Areas discussed:** Dashboard layout, Visual identity, Org model, Auth UX flow

---

## Dashboard Layout

### Navigation Style

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar (Recommended) | Collapsible sidebar like Linear — logo at top, nav items below, org switcher at bottom | ✓ |
| Top navbar | Horizontal nav bar like Vercel — cleaner for fewer items, less scalable | |
| Minimal sidebar | Icon-only sidebar like Factory — ultra-minimal, hover to expand | |
| You decide | Claude picks best approach | |

**User's choice:** Left sidebar (Recommended)

### Content Width

| Option | Description | Selected |
|--------|-------------|----------|
| Max-width centered | Content capped at ~1200px, centered — like Linear | |
| Full bleed | Content fills available width — like Vercel dashboard | |
| Adaptive | Full width for tables/dashboards, max-width for forms/settings | ✓ |

**User's choice:** Adaptive

### Navigation Items

| Option | Description | Selected |
|--------|-------------|----------|
| Campaigns + Reports + Settings | Three main sections as defined in DASH-04 | ✓ |
| Add Home/Overview | Home page with summary stats + the three sections | |
| You decide | Claude structures the nav | |

**User's choice:** Campaigns + Reports + Settings

---

## Visual Identity

### Typography

| Option | Description | Selected |
|--------|-------------|----------|
| Geist Sans + Mono | Vercel's font, already in prototype | ✓ |
| Inter | Industry standard for SaaS dashboards | |
| System fonts | OS defaults, zero load time | |
| You decide | Claude picks | |

**User's choice:** Geist Sans + Mono

### Component Library

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui (Recommended) | Prototype uses it, Tailwind-native, full control | ✓ |
| Radix + custom | Raw Radix primitives with custom styling | |
| You decide | Claude picks | |

**User's choice:** shadcn/ui (Recommended)

### Accent Color

| Option | Description | Selected |
|--------|-------------|----------|
| Purple-violet (#7C3AED) | Tailwind violet-600, bold, high-energy | |
| Blue-violet (#6366F1) | Tailwind indigo-500, professional, Linear-like | ✓ |
| Bright violet (#8B5CF6) | Tailwind violet-500, lighter, more playful | |

**User's choice:** Blue-violet (#6366F1)

### Information Density

| Option | Description | Selected |
|--------|-------------|----------|
| Spacious (Recommended) | Generous whitespace, premium feel | |
| Compact | Dense like Linear, power-user feel | |
| You decide | Claude balances per context | ✓ |

**User's choice:** You decide — with note: "but please be intentional when proposing the layout for each view"

---

## Org Model

### Org Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full org + invites | Create org, invite by email, shared campaigns | ✓ |
| Org shell only | Defer invites/team to v1.1 | |
| You decide | Claude assesses | |

**User's choice:** Full org + invites

### Org Creation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| During onboarding | Force org creation after signup | |
| Optional later | Personal workspace first, org later | |
| Auto-create | Auto-create default org on signup | |

**User's choice:** Other — "Claude decides based on plan and specs"

### Invite Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Email invite link | Admin enters email, invitee gets link | |
| Invite code | Admin generates code, shares however | |
| You decide | Claude picks simplest approach | ✓ |

**User's choice:** You decide

---

## Auth UX Flow

### Auth Page Design

| Option | Description | Selected |
|--------|-------------|----------|
| Split screen | Left: brand/illustration, Right: form. Linear-like | |
| Centered card | Dark bg, centered card. Vercel-like | |
| Full page form | Full-width dark page with form | |
| You decide | Claude picks based on visual identity | ✓ |

**User's choice:** You decide

### Auth Method

| Option | Description | Selected |
|--------|-------------|----------|
| Password only | Simple, proven | |
| Password + magic link | Both options, more modern | |
| You decide | Claude picks balance of simplicity vs UX | ✓ |

**User's choice:** You decide

### Post-Signup

| Option | Description | Selected |
|--------|-------------|----------|
| Email verify first | Must verify before dashboard access | |
| Skip to dashboard | Land immediately, verify in background | ✓ |
| You decide | Claude picks | |

**User's choice:** Skip to dashboard

---

## Claude's Discretion

- Auth page layout style
- Auth method (password-only vs magic links)
- Org creation timing
- Invite mechanism
- Loading skeletons, error states
- Spacing, border radii, shadows
- Sidebar default state

## Deferred Ideas

None — discussion stayed within phase scope
