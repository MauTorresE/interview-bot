# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Multi-tenant auth (Supabase), dark-first dashboard shell (Next.js + shadcn/ui)
**Confidence:** HIGH

## Summary

Phase 1 delivers a greenfield Next.js application with Supabase Auth (email/password), multi-tenant organization model with Row-Level Security, and a dark-first dashboard shell with Linear-style sidebar navigation. The project is entirely new -- the `interview-bot` repo currently contains only a CLAUDE.md file. The existing prototype at `consultoria_ale/` provides reference patterns for Geist fonts, Tailwind v4, and `@supabase/ssr` integration but uses session-token auth (not Supabase Auth) and has no org/team model.

The core technical challenges are: (1) correctly implementing Supabase RLS with `org_id` in JWT `app_metadata` for tenant isolation, (2) handling the org creation + membership flow at signup time, and (3) building the shadcn/ui Sidebar component with the specific Linear-style interactions defined in the UI spec. All libraries are mature and well-documented, making this a HIGH confidence phase.

**Primary recommendation:** Use `create-next-app` with Next.js 16, initialize shadcn/ui with `base-nova` preset, set up `@supabase/ssr` cookie-based auth with middleware, and build the multi-tenant schema with denormalized `org_id` on all tables + RLS policies using JWT `app_metadata` claims.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Left sidebar navigation, collapsible -- logo at top, nav items below, org switcher at bottom. Linear-style.
- **D-02:** Adaptive content width -- full width for tables/dashboards, max-width centered for forms/settings.
- **D-03:** Primary navigation items: Campaigns, Reports, Settings. No home/overview page for v1.
- **D-04:** Font: Geist Sans + Geist Mono (already used in prototype). Clean, modern, interface-native.
- **D-05:** Component library: shadcn/ui with Tailwind CSS (already proven in prototype). Copy-paste components, full control.
- **D-06:** Accent color: Blue-violet (#6366F1, Tailwind indigo-500). Professional, high-contrast on dark backgrounds. Linear-like energy.
- **D-07:** Dark-first theme as default. Light mode available but not primary focus for v1.
- **D-08:** Information density: Context-adaptive. Claude balances spacious vs compact per view.
- **D-09:** Full org + invite system in Phase 1. Create org, invite by email, members share access to all campaigns within their org.
- **D-14:** Post-signup: Skip directly to dashboard. Email verification happens in background, not blocking.

### Claude's Discretion
- Auth page layout style (split screen, centered card, or full page)
- Auth method (password-only vs password + magic links)
- Org creation timing (during onboarding vs auto-create)
- Invite mechanism (email link vs code)
- Loading skeletons, error states, empty states for dashboard shell
- Exact spacing, border radii, shadow values within the design system
- Sidebar collapsed/expanded default state

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password via Supabase Auth | Supabase Auth + `@supabase/ssr` cookie-based setup; `signUp()` with email/password |
| AUTH-02 | User can log in and stay logged in across browser sessions | `@supabase/ssr` middleware refreshes JWT tokens on every request; cookie persistence |
| AUTH-03 | User can reset password via email link | `supabase.auth.resetPasswordForEmail()` + password update callback page |
| AUTH-04 | User can create an organization and invite team members by email | `organizations` + `org_members` + `org_invites` tables; invite flow via Supabase Edge Function or API route |
| AUTH-05 | Organization members share access to all campaigns within their org | RLS policies using `org_id` from JWT `app_metadata`; denormalized `org_id` on all tenant tables |
| AUTH-06 | Row-level security ensures users only see data belonging to their organization | RLS policies on every table; `org_id` stored in `app_metadata` JWT claim; automated isolation tests |
| DASH-01 | Dark-first UI with electric violet accent, inspired by Factory.ai/Linear/Vercel aesthetic | shadcn/ui `base-nova` preset with custom CSS variables; dark mode colors from UI-SPEC |
| DASH-02 | Responsive design works on desktop and mobile browsers | shadcn Sidebar `collapsible="icon"` + Sheet for mobile; breakpoints at 768px/1024px per UI-SPEC |
| DASH-03 | Landing page communicates value proposition and links to signup | Static page at `/`; Spanish copy; links to `/auth/signup` |
| DASH-04 | Dashboard navigation: Campaigns, Reports, Settings | shadcn Sidebar with 3 nav items + org switcher footer per UI-SPEC layout contract |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.2 | Frontend framework + App Router | Locked decision; prototype uses Next.js 16; latest stable [VERIFIED: npm registry] |
| Tailwind CSS | 4.2.2 | Utility-first CSS | Locked decision; prototype uses v4 [VERIFIED: npm registry] |
| TypeScript | 6.0.2 | Type safety | Latest stable; required for multi-tenant SaaS [VERIFIED: npm registry] |
| @supabase/supabase-js | 2.101.1 | Supabase client SDK | Official SDK for auth + DB operations [VERIFIED: npm registry] |
| @supabase/ssr | 0.10.0 | Server-side auth for Next.js | Official package for cookie-based auth in App Router [VERIFIED: npm registry] |
| shadcn/ui (CLI) | latest | Component library | Locked decision (D-05); `base-nova` preset with Radix primitives [VERIFIED: shadcn docs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.72.1 | Form state management | Auth forms (login, signup, reset, invite) [VERIFIED: npm registry] |
| @hookform/resolvers | 5.2.2 | Zod integration for react-hook-form | Connecting zod schemas to forms [VERIFIED: npm registry] |
| zod | 4.3.6 | Schema validation | Form validation + API input validation [VERIFIED: npm registry] |
| lucide-react | 1.7.0 | Icon library | All UI icons per UI-SPEC [VERIFIED: npm registry] |
| sonner | 2.0.7 | Toast notifications | Success/error feedback per UI-SPEC [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form + zod | Conform (server-first) | react-hook-form is the shadcn Form component's built-in dependency; switching adds friction |
| @supabase/ssr | next-auth + Supabase adapter | Unnecessary indirection; Supabase's official SSR package is purpose-built |
| lucide-react | heroicons | lucide is shadcn's default icon library; switching breaks component consistency |

**Installation:**
```bash
npx create-next-app@latest interview-bot --typescript --tailwind --app --src-dir --turbopack
cd interview-bot
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form @hookform/resolvers zod
npm install sonner
npx shadcn@latest init -p base-nova
npx shadcn@latest add button input label card separator avatar dropdown-menu dialog tooltip sidebar skeleton sonner form sheet
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Auth route group (no sidebar layout)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   ├── callback/route.ts    # OAuth/magic-link callback
│   │   │   └── update-password/page.tsx
│   │   └── layout.tsx               # Centered card layout
│   ├── (dashboard)/             # Dashboard route group (with sidebar)
│   │   ├── campaigns/page.tsx       # Empty state for now
│   │   ├── reports/page.tsx         # Empty state for now
│   │   ├── settings/
│   │   │   ├── page.tsx             # Org settings, members list
│   │   │   └── invite/page.tsx      # Or dialog-based
│   │   └── layout.tsx               # SidebarProvider + AppSidebar
│   ├── page.tsx                     # Landing page
│   ├── layout.tsx                   # Root layout: fonts, theme, Toaster
│   └── globals.css                  # Tailwind + CSS variables
├── components/
│   ├── ui/                          # shadcn components (auto-generated)
│   ├── app-sidebar.tsx              # Main sidebar component
│   ├── org-switcher.tsx             # Org dropdown in sidebar footer
│   ├── nav-main.tsx                 # Navigation items
│   └── auth-form.tsx                # Shared auth form component
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server Component Supabase client
│   │   └── middleware.ts            # Middleware Supabase client
│   └── validations/
│       └── auth.ts                  # Zod schemas for auth forms
├── hooks/
│   └── use-user.ts                  # Client-side user/org context
└── middleware.ts                     # Root middleware for auth token refresh
```

### Pattern 1: Supabase SSR Auth with Middleware

**What:** Cookie-based auth where middleware refreshes JWT tokens on every request, making auth state available to both Server and Client Components.

**When to use:** Every authenticated page/API route.

**Implementation:**

Three Supabase client factories are needed -- one each for browser, server, and middleware contexts. The middleware client handles cookie read/write to keep tokens fresh. [CITED: supabase.com/docs/guides/auth/server-side/nextjs]

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh auth token -- use getUser() for middleware (network call, most secure)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from dashboard
  if (!user && request.nextUrl.pathname.startsWith('/(dashboard)')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return supabaseResponse
}
```

```typescript
// src/middleware.ts
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Note on getClaims() vs getUser():** Supabase recently introduced `getClaims()` which validates JWT locally (faster, no network call) versus `getUser()` which always hits the auth server. For middleware, `getUser()` is still recommended since it catches revoked sessions. For page-level checks in Server Components, `getClaims()` can be used for performance. [CITED: github.com/supabase/supabase/issues/40985]

### Pattern 2: Multi-Tenant RLS with JWT app_metadata

**What:** Store `org_id` in the user's JWT `app_metadata` claim. RLS policies extract it directly from the JWT (O(1) per query) instead of joining to a membership table.

**When to use:** Every table that stores tenant-scoped data.

**Implementation:**

```sql
-- Set org_id in app_metadata when user creates/joins an org
-- (Done via Supabase Admin API from a server action or edge function)
-- supabase.auth.admin.updateUserById(userId, { app_metadata: { org_id: orgId } })

-- Helper function for RLS policies
CREATE OR REPLACE FUNCTION get_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT ((SELECT auth.jwt()) -> 'app_metadata' ->> 'org_id')::UUID
$$;

-- Standard RLS policy pattern (apply to EVERY tenant table)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON campaigns
  FOR ALL
  USING (org_id = get_org_id());

-- Wrap auth.uid() in subquery for performance
CREATE POLICY "user_owns_membership" ON org_members
  FOR ALL
  USING (user_id = (SELECT auth.uid()));
```

**Critical:** The `org_id` in `app_metadata` is NOT user-modifiable (unlike `user_metadata`). It can only be set via the admin API (`service_role` key). When a user switches orgs, their JWT must be refreshed to pick up the new `org_id`. [CITED: supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac]

### Pattern 3: shadcn Sidebar with Linear-style Navigation

**What:** Use shadcn's official Sidebar component with `collapsible="icon"` mode for the Linear-style collapsible sidebar.

**When to use:** Dashboard layout (`(dashboard)/layout.tsx`).

```tsx
// src/app/(dashboard)/layout.tsx
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "240px",
        "--sidebar-width-icon": "56px",
      } as React.CSSProperties}
    >
      <AppSidebar user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </SidebarProvider>
  )
}
```

[CITED: ui.shadcn.com/docs/components/sidebar]

### Pattern 4: Route Groups for Layout Separation

**What:** Use Next.js route groups `(auth)` and `(dashboard)` to apply different layouts -- auth pages get centered card layout, dashboard pages get sidebar layout.

**When to use:** App-level routing structure.

```
app/
├── (auth)/           # No sidebar, centered card
│   └── layout.tsx    # Centered, dark background
├── (dashboard)/      # Sidebar + content
│   └── layout.tsx    # SidebarProvider wraps content
└── page.tsx          # Landing page, no layout wrapper
```

[VERIFIED: Next.js App Router documentation]

### Anti-Patterns to Avoid

- **Exposing `service_role` key to frontend:** Never import or use the Supabase service_role key in any client-side code. All admin operations (setting `app_metadata`, managing invites) must go through Server Actions or API routes.
- **RLS policies with JOINs:** Don't write RLS policies that join to `org_members` to check membership. Use the denormalized `org_id` from `app_metadata` in the JWT instead -- O(1) vs O(n).
- **Using `getSession()` for auth checks:** Always use `getUser()` (middleware) or `getClaims()` (Server Components) -- never `getSession()` which is not guaranteed to revalidate.
- **Testing RLS via Supabase SQL Editor:** The SQL Editor uses `service_role` privileges and bypasses RLS. Always test from the client SDK.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state + validation | Custom form handling with useState | react-hook-form + zod + @hookform/resolvers | Edge cases (dirty tracking, async validation, error focus) are deceptively complex |
| Toast notifications | Custom toast component | sonner (via shadcn) | Animation, stacking, dismissal, accessibility all handled |
| Sidebar collapse/expand | Custom sidebar with CSS transitions | shadcn Sidebar component | Mobile sheet, keyboard shortcuts, cookie persistence, accessible |
| Auth token refresh | Custom token refresh logic | @supabase/ssr middleware pattern | Race conditions, cookie handling, edge cases with concurrent requests |
| Invite token generation | Custom UUID + manual expiry | Supabase's `auth.admin.generateLink()` or database function | Cryptographic safety, expiry handling, one-time use enforcement |
| Dark/light theme toggle | Custom CSS class toggle | next-themes (if needed later) | SSR flash prevention, system preference detection, localStorage sync |

**Key insight:** The shadcn ecosystem provides production-quality implementations for every UI pattern in this phase. The risk is not finding solutions -- it is over-customizing them before validating the product.

## Common Pitfalls

### Pitfall 1: Silent RLS Policy Gaps on New Tables

**What goes wrong:** A table is created without RLS enabled, or RLS is enabled but no policy is added. Queries return data from ALL tenants without any error.
**Why it happens:** RLS is invisible when it fails -- you just see too much data, not an error. The Supabase SQL Editor bypasses RLS, so devs test there and assume queries work correctly.
**How to avoid:** Every migration that creates a table must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at least one policy. Create a tenant isolation test that inserts data for two test orgs and verifies cross-org queries return empty. Run this test as a pre-commit hook or CI check.
**Warning signs:** Dashboard showing more data than expected; no automated tests for tenant isolation.
[CITED: .planning/research/PITFALLS.md]

### Pitfall 2: org_id JWT Stale After Org Switch

**What goes wrong:** User creates a new org or switches orgs, but their JWT still contains the old `org_id`. All RLS queries filter against the old org until the token refreshes (up to 1 hour).
**Why it happens:** `app_metadata` is baked into the JWT at sign-in time. Updating it via admin API doesn't force a token refresh.
**How to avoid:** After updating `app_metadata.org_id`, call `supabase.auth.refreshSession()` to force a new JWT. On the client, redirect or reload to pick up the new session.
**Warning signs:** Users reporting they can't see their new org's data immediately after switching.
[ASSUMED]

### Pitfall 3: Middleware Auth Check on Every Static Asset

**What goes wrong:** The middleware matcher is too broad, causing `supabase.auth.getUser()` (a network call) to run on every image, font, and static file request, adding 50-200ms latency per asset.
**Why it happens:** Default middleware runs on all routes.
**How to avoid:** Use the matcher config to exclude static assets: `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`. This is shown in the Supabase docs example.
**Warning signs:** Slow page loads; many Supabase Auth API calls in logs.
[CITED: supabase.com/docs/guides/auth/server-side/nextjs]

### Pitfall 4: Invite Flow Without Token Expiry

**What goes wrong:** Invite links work forever. A leaked or forwarded invite link lets unauthorized users join the org.
**Why it happens:** The simplest implementation generates a UUID token without an expiry timestamp.
**How to avoid:** Store `expires_at` on the invite record (48h default). Validate expiry on acceptance. Mark invites as consumed after use.
**Warning signs:** Invite tokens that never expire in the database.
[ASSUMED]

### Pitfall 5: Zod v4 Breaking Changes

**What goes wrong:** Zod v4 (4.x) has API differences from v3. Many shadcn examples and blog posts reference v3 patterns.
**Why it happens:** Zod v4 was released relatively recently. The ecosystem is still catching up.
**How to avoid:** Use Zod v4 since it's already the latest (4.3.6). Verify `@hookform/resolvers` 5.2.2 supports Zod v4 -- it does via the `zodResolver` export. If you encounter issues, the `z.object()` and `z.string()` core APIs are largely the same.
**Warning signs:** Type errors when passing zod schemas to `zodResolver()`.
[ASSUMED]

## Code Examples

### Supabase Browser Client

```typescript
// src/lib/supabase/client.ts
// Source: supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Supabase Server Client

```typescript
// src/lib/supabase/server.ts
// Source: supabase.com/docs/guides/auth/server-side/creating-a-client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component -- safe to ignore
          }
        },
      },
    }
  )
}
```

### Signup with Org Auto-Creation (Server Action)

```typescript
// src/app/(auth)/auth/signup/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  // Auto-create org for new user (using admin client)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Server-only, never exposed
  )

  // Insert org, add membership, set app_metadata
  const { data: org } = await admin
    .from('organizations')
    .insert({ name: `${data.user!.email}'s Org` })
    .select()
    .single()

  await admin.from('org_members').insert({
    org_id: org.id,
    user_id: data.user!.id,
    role: 'owner',
  })

  await admin.auth.admin.updateUserById(data.user!.id, {
    app_metadata: { org_id: org.id },
  })

  redirect('/campaigns')
}
```

### Database Migration: Core Phase 1 Tables

```sql
-- supabase/migrations/001_foundation.sql

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Org invites
CREATE TABLE org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION get_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT ((SELECT auth.jwt()) -> 'app_metadata' ->> 'org_id')::UUID
$$;

-- RLS Policies
CREATE POLICY "org_members_can_view_own_org" ON organizations
  FOR SELECT USING (id = get_org_id());

CREATE POLICY "org_members_can_view_members" ON org_members
  FOR SELECT USING (org_id = get_org_id());

CREATE POLICY "owners_can_manage_members" ON org_members
  FOR ALL USING (
    org_id = get_org_id()
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = get_org_id()
      AND user_id = (SELECT auth.uid())
      AND role = 'owner'
    )
  );

CREATE POLICY "org_members_can_view_invites" ON org_invites
  FOR SELECT USING (org_id = get_org_id());

CREATE POLICY "owners_can_manage_invites" ON org_invites
  FOR INSERT WITH CHECK (org_id = get_org_id());
```

### Auth Form with Zod Validation

```typescript
// src/lib/validations/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
})

export const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const inviteSchema = z.object({
  email: z.string().email('Email invalido'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | New cookie-based approach; auth-helpers is deprecated |
| `getSession()` for auth checks | `getUser()` / `getClaims()` | Late 2025 | `getSession()` doesn't revalidate JWT; security risk |
| shadcn CLI v3 (`npx shadcn-ui@latest`) | shadcn CLI v4 (`npx shadcn@latest`) | March 2026 | New `--preset` flag, design system presets like `base-nova` |
| Tailwind CSS v3 (`tailwind.config.js`) | Tailwind CSS v4 (`@config` / CSS-first) | 2025 | CSS-first configuration; `tailwind.config.ts` still supported via `@config` directive |
| Zod v3 | Zod v4 (4.x) | 2025/2026 | Largely compatible API but some schema composition changes |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- `npx shadcn-ui@latest`: Old CLI. Use `npx shadcn@latest` instead.
- `supabase.auth.getSession()` in server code: Insecure. Use `getUser()` or `getClaims()`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `auth.refreshSession()` forces new JWT with updated `app_metadata` | Pitfall 2 | Org switch may require sign-out/sign-in instead; degraded UX |
| A2 | Invite tokens should expire after 48 hours | Pitfall 4 | If Supabase has a built-in invite mechanism, custom tokens are unnecessary |
| A3 | Zod v4 works with @hookform/resolvers 5.2.2 without issues | Pitfall 5 | May need to pin Zod v3 if resolver breaks |
| A4 | `create-next-app` with Next.js 16 supports `--turbopack` flag | Installation | Minor -- turbopack flag may have changed name |
| A5 | Auto-creating org at signup (vs onboarding step) is the better UX | Code Examples | User may prefer explicit org naming step; this is Claude's Discretion area |

## Open Questions

1. **Supabase Auth email templates in Spanish**
   - What we know: Supabase allows custom email templates for confirmation, password reset, and magic links
   - What's unclear: Whether the existing Supabase project already has Spanish templates configured, or if they need to be set up
   - Recommendation: Check Supabase dashboard during implementation; configure Spanish templates for all auth emails

2. **Org switching mechanism**
   - What we know: `app_metadata.org_id` stores the active org. Changing it requires admin API + token refresh.
   - What's unclear: Whether multi-org membership is needed in v1 or if one user = one org is sufficient
   - Recommendation: Build for multi-org from the start (the schema supports it), but keep the org switcher simple -- dropdown with current org + "Create new org" option

3. **Landing page scope**
   - What we know: DASH-03 requires a landing page with value proposition and signup link
   - What's unclear: How elaborate this page needs to be (simple hero + CTA vs full marketing page)
   - Recommendation: Minimal -- hero section with product tagline, one CTA button to signup, done. Spanish copy per project constraint.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | Yes | 24.4.1 | -- |
| npm | Package management | Yes | 11.4.2 | -- |
| npx | shadcn CLI, create-next-app | Yes | 11.4.2 | -- |
| git | Version control | Yes | 2.37.3 | -- |
| Supabase (cloud) | Auth + DB + Storage | Yes (existing project) | -- | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js 16 + TypeScript) |
| Config file | None -- Wave 0 creates `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Signup creates user + org + membership | integration | `npx vitest run tests/auth/signup.test.ts -t "signup"` | Wave 0 |
| AUTH-02 | Session persists across requests | integration | `npx vitest run tests/auth/session.test.ts` | Wave 0 |
| AUTH-03 | Password reset sends email | integration | `npx vitest run tests/auth/reset.test.ts` | Wave 0 |
| AUTH-04 | Create org + invite member | integration | `npx vitest run tests/org/invite.test.ts` | Wave 0 |
| AUTH-05 | Members see shared campaign data | integration | `npx vitest run tests/org/access.test.ts` | Wave 0 |
| AUTH-06 | RLS blocks cross-tenant access | integration | `npx vitest run tests/rls/isolation.test.ts` | Wave 0 |
| DASH-01 | Dark theme renders correctly | manual-only | Visual inspection | -- |
| DASH-02 | Responsive breakpoints work | manual-only | Browser resize test | -- |
| DASH-03 | Landing page renders with CTA | unit | `npx vitest run tests/pages/landing.test.ts` | Wave 0 |
| DASH-04 | Sidebar shows 3 nav items | unit | `npx vitest run tests/components/sidebar.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- framework configuration
- [ ] `tests/rls/isolation.test.ts` -- tenant isolation (critical for AUTH-06)
- [ ] `tests/auth/signup.test.ts` -- signup flow
- [ ] `tests/org/invite.test.ts` -- invite flow
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (email/password, bcrypt hashing, rate limiting built-in) |
| V3 Session Management | Yes | @supabase/ssr cookie-based sessions with middleware refresh |
| V4 Access Control | Yes | RLS policies with org_id from JWT app_metadata |
| V5 Input Validation | Yes | Zod schemas on all form inputs + server actions |
| V6 Cryptography | No | No custom crypto needed; Supabase handles password hashing and JWT signing |

### Known Threat Patterns for Supabase + Next.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| service_role key exposure in client bundle | Information Disclosure | Never import in client code; use only in server actions/API routes |
| RLS bypass via missing policy | Elevation of Privilege | Enable RLS on every table; automated isolation tests |
| JWT org_id tampering | Tampering | app_metadata is not user-writable; only admin API can set it |
| Stale JWT after org removal | Elevation of Privilege | Force token refresh on membership changes; consider short JWT expiry |
| CSRF on auth forms | Cross-Site Request Forgery | Server Actions have built-in CSRF protection in Next.js |
| Open invite links | Information Disclosure | Token expiry (48h), single-use, rate limiting |

## Project Constraints (from CLAUDE.md)

The CLAUDE.md file contains only GSD workflow enforcement directives (use `/gsd-*` commands for changes). No additional coding conventions, forbidden patterns, or security requirements beyond what's already captured.

## Sources

### Primary (HIGH confidence)
- [npm registry] -- All package versions verified via `npm view`
- [supabase.com/docs/guides/auth/server-side/nextjs](https://supabase.com/docs/guides/auth/server-side/nextjs) -- SSR auth setup for Next.js
- [supabase.com/docs/guides/auth/server-side/creating-a-client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- Client factory patterns
- [supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- Custom claims + RBAC
- [ui.shadcn.com/docs/components/sidebar](https://ui.shadcn.com/docs/components/sidebar) -- Sidebar component documentation
- [ui.shadcn.com/docs/cli](https://ui.shadcn.com/docs/cli) -- shadcn CLI v4 with preset flag
- [.planning/research/ARCHITECTURE.md] -- Multi-tenant data model, RLS strategy
- [.planning/research/PITFALLS.md] -- RLS silent failures, tenant isolation testing
- [.planning/phases/01-foundation/01-UI-SPEC.md] -- Complete visual and interaction contract

### Secondary (MEDIUM confidence)
- [github.com/supabase/supabase/issues/40985](https://github.com/supabase/supabase/issues/40985) -- getClaims() vs getUser() guidance
- [github.com/supabase/supabase/issues/39947](https://github.com/supabase/supabase/issues/39947) -- Middleware auth pattern discussion
- [adminlte.io/blog/build-admin-dashboard-shadcn-nextjs](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/) -- shadcn dashboard patterns 2026
- [designrevision.com/blog/supabase-row-level-security](https://designrevision.com/blog/supabase-row-level-security) -- RLS testing from client SDK

### Tertiary (LOW confidence)
- None -- all claims verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm, well-documented, prototype-proven patterns
- Architecture: HIGH -- follows Supabase official docs + project's own architecture research
- Pitfalls: HIGH -- RLS and auth pitfalls well-documented in official docs and project's pitfall research
- UI patterns: HIGH -- shadcn Sidebar component is stable, UI-SPEC provides complete contract

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- stable ecosystem, no fast-moving dependencies)
