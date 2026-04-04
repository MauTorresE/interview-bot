'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/nav-main'
import { OrgSwitcher } from '@/components/org-switcher'

type Org = {
  id: string
  name: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  orgs: Org[]
  activeOrg: Org | null
  userEmail: string
}

export function AppSidebar({
  orgs,
  activeOrg,
  userEmail,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader className="border-b border-border px-4 py-3">
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <OrgSwitcher orgs={orgs} activeOrg={activeOrg} userEmail={userEmail} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SidebarLogo() {
  const { state } = useSidebar()
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        E
      </div>
      {state === 'expanded' && (
        <span className="text-sm font-semibold text-foreground">
          EntrevistaAI
        </span>
      )}
    </div>
  )
}
