import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's org memberships
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name)')
    .eq('user_id', user.id)

  const orgs =
    memberships?.map((m) => {
      const org = m.organizations as unknown as { id: string; name: string }
      return { id: org.id, name: org.name }
    }) ?? []

  // Active org from app_metadata
  const activeOrgId = user.app_metadata?.org_id
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '240px',
          '--sidebar-width-icon': '56px',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        orgs={orgs}
        activeOrg={activeOrg}
        userEmail={user.email ?? ''}
      />
      <main className="flex flex-1 flex-col overflow-auto">
        <header className="flex h-12 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </main>
    </SidebarProvider>
  )
}
