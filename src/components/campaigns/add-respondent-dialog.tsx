'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addRespondentSchema, type AddRespondentInput } from '@/lib/validations/campaign'
import { addRespondent } from '@/app/(dashboard)/campaigns/[id]/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

type AddRespondentDialogProps = {
  campaignId: string
  trigger: React.ReactNode
}

export function AddRespondentDialog({
  campaignId,
  trigger,
}: AddRespondentDialogProps) {
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddRespondentInput>({
    resolver: zodResolver(addRespondentSchema),
  })

  async function onSubmit(data: AddRespondentInput) {
    const result = await addRespondent(campaignId, data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Participante agregado')
    reset()
    setOpen(false)
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Agregar participante</DialogTitle>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <div>
              <Label htmlFor="respondent-name">Nombre</Label>
              <Input
                id="respondent-name"
                type="text"
                placeholder="Nombre del participante"
                className="mt-2"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="respondent-email">Email</Label>
              <Input
                id="respondent-email"
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
            <div>
              <Label htmlFor="respondent-notes">Notas</Label>
              <Textarea
                id="respondent-notes"
                rows={2}
                placeholder="Notas opcionales sobre el participante"
                className="mt-2"
                {...register('notes')}
                disabled={isSubmitting}
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                'Agregar participante'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
