import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const createOrgSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede tener más de 50 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type InviteInput = z.infer<typeof inviteSchema>
export type CreateOrgInput = z.infer<typeof createOrgSchema>
