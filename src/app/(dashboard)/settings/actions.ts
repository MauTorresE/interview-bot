'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrgSchema } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

type ActionResult = {
  success?: boolean
  error?: string
}

export async function createOrg(input: {
  name: string
}): Promise<ActionResult> {
  const parsed = createOrgSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Nombre de organización inválido.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  const admin = createAdminClient()

  // Create organization
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: parsed.data.name })
    .select('id')
    .single()

  if (orgError || !org) {
    return { error: 'No se pudo crear la organización. Intenta de nuevo.' }
  }

  // Add user as owner
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    // Clean up the org if member insert fails
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: 'No se pudo crear la organización. Intenta de nuevo.' }
  }

  // Update user's app_metadata to point to new org
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { org_id: org.id },
  })

  revalidatePath('/', 'layout')

  return { success: true }
}

export async function switchOrg(orgId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  // Verify user is a member of the target org (T-03-04)
  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'No tienes acceso a esta organización.' }
  }

  // Update app_metadata with new org_id
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { org_id: orgId },
  })

  revalidatePath('/', 'layout')

  return { success: true }
}

export async function removeMember(
  targetUserId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado.' }
  }

  const activeOrgId = user.app_metadata?.org_id
  if (!activeOrgId) {
    return { error: 'Sin organización activa.' }
  }

  const admin = createAdminClient()

  // Verify current user is owner
  const { data: currentMembership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', activeOrgId)
    .eq('user_id', user.id)
    .single()

  if (!currentMembership || currentMembership.role !== 'owner') {
    return { error: 'Solo el propietario puede eliminar miembros.' }
  }

  // Prevent removing self
  if (targetUserId === user.id) {
    return { error: 'No puedes eliminarte a ti mismo.' }
  }

  // Remove the member
  const { error: deleteError } = await admin
    .from('org_members')
    .delete()
    .eq('org_id', activeOrgId)
    .eq('user_id', targetUserId)

  if (deleteError) {
    return { error: 'No se pudo eliminar al miembro. Intenta de nuevo.' }
  }

  revalidatePath('/settings')

  return { success: true }
}
