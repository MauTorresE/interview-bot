'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updatePasswordSchema } from '@/lib/validations/auth'

export async function updatePassword(formData: {
  password: string
  confirmPassword: string
}) {
  const parsed = updatePasswordSchema.safeParse(formData)
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues
    return {
      error:
        fieldErrors[0]?.message ??
        'Datos invalidos. Verifica los campos e intenta de nuevo.',
    }
  }

  const { password } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'No se pudo actualizar la contrasena. Intenta de nuevo.' }
  }

  redirect('/campaigns')
}
