import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const activeOrgId = user.app_metadata?.org_id

  // Fetch org details
  const { data: org } = activeOrgId
    ? await supabase
        .from('organizations')
        .select('id, name, created_at')
        .eq('id', activeOrgId)
        .single()
    : { data: null }

  // Fetch org members
  const { data: members } = activeOrgId
    ? await supabase
        .from('org_members')
        .select('user_id, role, created_at')
        .eq('organization_id', activeOrgId)
    : { data: null }

  return (
    <div className="flex flex-1 flex-col p-8 md:p-8 p-4">
      <h1 className="text-xl font-semibold text-foreground">Configuracion</h1>
      <div className="mx-auto mt-8 w-full max-w-[640px]">
        {/* Organization section */}
        <section>
          <h2 className="text-base font-semibold text-foreground">
            Organizacion
          </h2>
          <Separator className="my-4" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm text-foreground">
                {org?.name ?? 'Sin organizacion'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Creada</span>
              <span className="text-sm text-foreground">
                {org?.created_at
                  ? new Date(org.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
          </div>
        </section>

        {/* Members section */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Miembros
            </h2>
            <Button variant="outline" size="sm" disabled>
              Invitar miembro
            </Button>
          </div>
          <Separator className="my-4" />
          <div className="flex flex-col gap-3">
            {members && members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-xs">
                      {member.user_id.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{member.user_id}</p>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {member.role}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay miembros en esta organizacion.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
