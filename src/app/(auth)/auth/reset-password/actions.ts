'use server'

import { createClient } from '@/lib/supabase/server'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { headers } from 'next/headers'

export async function resetPassword(formData: { email: string }) {
  const parsed = resetPasswordSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: 'Email invalido.' }
  }

  const { email } = parsed.data
  const supabase = await createClient()

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    // Don't reveal whether email exists -- always show success message
    // This is a T-02-02 mitigation
  }

  return { success: true }
}
