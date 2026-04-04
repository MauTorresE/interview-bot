'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderOpen, FileBarChart, Settings } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navItems = [
  {
    title: 'Campanas',
    href: '/campaigns',
    icon: FolderOpen,
  },
  {
    title: 'Reportes',
    href: '/reports',
    icon: FileBarChart,
  },
  {
    title: 'Configuracion',
    href: '/settings',
    icon: Settings,
  },
]

export function NavMain() {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Workspace
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  className={
                    isActive
                      ? 'border-l-[3px] border-l-primary bg-primary/10 font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-[#262626] hover:text-foreground'
                  }
                  render={<Link href={item.href} />}
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
