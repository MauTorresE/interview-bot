'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema } from '@/lib/validations/auth'

export async function signup(formData: {
  name: string
  email: string
  password: string
}) {
  const parsed = signupSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: 'Datos invalidos. Verifica los campos e intenta de nuevo.' }
  }

  const { name, email, password } = parsed.data

  // Use admin client to create user with auto-confirm (D-14: skip email verification)
  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (authError || !authData.user) {
    return {
      error: authError?.message ?? 'No se pudo crear la cuenta. Intenta de nuevo.',
    }
  }

  const userId = authData.user.id

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: `${name}'s Org` })
    .select('id')
    .single()

  if (orgError || !org) {
    // User created but org failed -- still redirect, they can create org later
    return { error: 'Cuenta creada pero no se pudo crear la organizacion.' }
  }

  // Add user as owner of the new org
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: userId,
    role: 'owner',
  })

  if (memberError) {
    return { error: 'Cuenta creada pero no se pudo asignar a la organizacion.' }
  }

  // Set org_id in user's app_metadata for RLS policies
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { org_id: org.id },
  })

  redirect('/campaigns')
}
