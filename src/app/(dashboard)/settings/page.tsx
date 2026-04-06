import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { MembersList, type Member } from '@/components/members-list'
import { InviteMemberDialog } from '@/components/invite-member-dialog'

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

  // Fetch org members with user info via admin client
  let members: Member[] = []
  let isOwner = false

  if (activeOrgId) {
    const admin = createAdminClient()

    const { data: memberRows } = await admin
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('org_id', activeOrgId)

    if (memberRows) {
      // Fetch user details for each member
      const memberPromises = memberRows.map(async (m) => {
        const {
          data: { user: memberUser },
        } = await admin.auth.admin.getUserById(m.user_id)
        return {
          user_id: m.user_id,
          email: memberUser?.email ?? null,
          name: (memberUser?.user_metadata?.name as string) ?? null,
          role: m.role,
        }
      })
      members = await Promise.all(memberPromises)

      // Check if current user is owner
      const currentMember = memberRows.find((m) => m.user_id === user.id)
      isOwner = currentMember?.role === 'owner'
    }
  }

  // Fetch pending invites
  let pendingInvites: Array<{
    id: string
    email: string
    expires_at: string
  }> = []

  if (activeOrgId) {
    const { data: invites } = await supabase
      .from('org_invites')
      .select('id, email, expires_at')
      .eq('org_id', activeOrgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    pendingInvites = invites ?? []
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8">
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
            {activeOrgId && <InviteMemberDialog orgId={activeOrgId} />}
          </div>
          <Separator className="my-4" />
          {members.length > 0 ? (
            <MembersList
              members={members}
              currentUserId={user.id}
              isOwner={isOwner}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay miembros en esta organizacion.
            </p>
          )}
        </section>

        {/* Pending invites section */}
        {pendingInvites.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-foreground">
              Invitaciones pendientes
            </h2>
            <Separator className="my-4" />
            <div className="flex flex-col gap-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg p-2"
                >
                  <span className="text-sm text-foreground">
                    {invite.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Expira{' '}
                    {new Date(invite.expires_at).toLocaleDateString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
