'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteSchema, type InviteInput } from '@/lib/validations/auth'
import { sendInvite } from '@/app/(dashboard)/settings/invite/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

type InviteMemberDialogProps = {
  orgId: string
}

export function InviteMemberDialog({ orgId }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
  })

  async function onSubmit(data: InviteInput) {
    const result = await sendInvite({ email: data.email, orgId })

    if (result.error) {
      toast.error(
        'No se pudo enviar la invitación. Verifica el email e intenta de nuevo.'
      )
      return
    }

    if (result.inviteLink) {
      toast.success('Invitación enviada', {
        description: `Enlace de invitación: ${result.inviteLink}`,
        duration: 10000,
      })
    } else {
      toast.success('Invitación enviada')
    }

    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Enviar invitación
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para unirse a tu organización.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="correo@ejemplo.com"
              className="mt-2"
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar invitación'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
