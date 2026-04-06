'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCampaignSchema } from '@/lib/validations/campaign'
import { createCampaign } from '@/app/(dashboard)/campaigns/actions'
import { LANGUAGES, DURATION_OPTIONS } from '@/lib/constants/campaign'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: '',
      description: '',
      language: 'es-419' as const,
      duration_target_minutes: '15' as const,
    },
  })

  const languageValue = watch('language')
  const durationValue = watch('duration_target_minutes')

  async function onSubmit(data: Record<string, unknown>) {
    const result = await createCampaign({
      name: data.name as string,
      description: (data.description as string) || undefined,
      language: data.language as string,
      duration_target_minutes: String(data.duration_target_minutes),
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Campaña creada')
    reset()
    setOpen(false)
    if (result.data?.id) {
      router.push(`/campaigns/${result.data.id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        Crear campaña
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Crear campaña</DialogTitle>
            <DialogDescription>
              Configura los datos básicos de tu nueva campaña de entrevistas.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-6">
            <div>
              <Label htmlFor="campaign-name">Nombre *</Label>
              <Input
                id="campaign-name"
                placeholder="Mi campaña de investigación"
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
              <Label htmlFor="campaign-description">Descripción</Label>
              <Textarea
                id="campaign-description"
                placeholder="Describe brevemente el objetivo de esta campaña..."
                rows={3}
                className="mt-2"
                {...register('description')}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Idioma *</Label>
                <Select
                  value={languageValue}
                  onValueChange={(val) => setValue('language', val as 'es-419' | 'es-ES')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duración *</Label>
                <Select
                  value={durationValue}
                  onValueChange={(val) => setValue('duration_target_minutes', val as '10' | '15' | '30')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear campaña'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
