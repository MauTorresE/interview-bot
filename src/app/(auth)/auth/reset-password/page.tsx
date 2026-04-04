'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/lib/validations/auth'
import { resetPassword } from './actions'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(data: ResetPasswordInput) {
    setError(null)
    setSuccess(false)
    const result = await resetPassword(data)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <CardContent className="p-0">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-foreground">
              Te enviamos un enlace para restablecer tu contrasena. Revisa tu
              bandeja de entrada.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Volver a iniciar sesion
            </Link>
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Restablecer contrasena
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Volver a iniciar sesion
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
