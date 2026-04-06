'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validations/auth'

export async function login(formData: { email: string; password: string }) {
  const parsed = loginSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: 'Datos inválidos. Verifica los campos e intenta de nuevo.' }
  }

  const { email, password } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      error:
        'Credenciales incorrectas. Verifica tu email y contraseña e intenta de nuevo.',
    }
  }

  redirect('/campaigns')
}
