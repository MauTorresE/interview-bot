'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Plus, LogOut, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { switchOrg } from '@/app/(dashboard)/settings/actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { CreateOrgDialog } from '@/components/create-org-dialog'
import { toast } from 'sonner'

type Org = {
  id: string
  name: string
}

type OrgSwitcherProps = {
  orgs: Org[]
  activeOrg: Org | null
  userEmail: string
}

export function OrgSwitcher({ orgs, activeOrg, userEmail }: OrgSwitcherProps) {
  const router = useRouter()
  const [createOrgOpen, setCreateOrgOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function handleSwitchOrg(orgId: string) {
    if (orgId === activeOrg?.id) return

    const result = await switchOrg(orgId)
    if (result.error) {
      toast.error(result.error)
      return
    }

    router.refresh()
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                />
              }
            >
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/20 text-xs text-primary">
                  {activeOrg?.name?.charAt(0)?.toUpperCase() ?? 'O'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeOrg?.name ?? 'Sin organizacion'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--trigger-width] min-w-56"
              align="start"
              side="top"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
                {orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                  >
                    <Avatar className="mr-2 size-5">
                      <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{org.name}</span>
                    {activeOrg?.id === org.id && (
                      <Check className="ml-auto size-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
                <Plus className="mr-2 size-4" />
                Crear organizacion
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 size-4" />
                Cerrar sesion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateOrgDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </>
  )
}
