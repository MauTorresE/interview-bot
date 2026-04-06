'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { researchBriefSchema, type ResearchBriefInput, type ResearchBriefOutput } from '@/lib/validations/campaign'
import { saveBrief } from '@/app/(dashboard)/campaigns/[id]/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BriefPreviewDialog } from './brief-preview-dialog'
import { FileText, Loader2, Plus, X } from 'lucide-react'

type BriefTabProps = {
  campaignId: string
  brief: { brief_data: ResearchBriefOutput } | null
}

export function BriefTab({ campaignId, brief }: BriefTabProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const firstTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ResearchBriefOutput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(researchBriefSchema) as any,
    defaultValues: brief?.brief_data ?? {
      research_goals: '',
      critical_data_points: '',
      critical_paths: [],
      context_background: '',
      tone_approach: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'critical_paths',
  })

  const watchedValues = watch()

  // Warn about unsaved changes on page leave
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function onSubmit(data: ResearchBriefOutput) {
    const result = await saveBrief(campaignId, data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Guia guardada')
    reset(data)
  }

  const isEmpty =
    !brief &&
    !watchedValues.research_goals &&
    !watchedValues.critical_data_points &&
    !watchedValues.context_background &&
    !watchedValues.tone_approach &&
    (!watchedValues.critical_paths || watchedValues.critical_paths.length === 0)

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <FileText className="size-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Guia sin completar
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Define los objetivos y datos criticos que el AI debe obtener durante
            las entrevistas.
          </p>
        </div>
        <Button
          className="mt-2"
          onClick={() => firstTextareaRef.current?.focus()}
        >
          Completar guia
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Guia de investigacion
          </h2>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Guardar
            {isDirty && (
              <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Section 1: Objetivos de investigacion */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-semibold">
                Objetivos de investigacion
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Que quieres aprender de esta investigacion?
              </p>
              <Textarea
                className="mt-3"
                rows={4}
                {...register('research_goals')}
                ref={(e) => {
                  register('research_goals').ref(e)
                  firstTextareaRef.current = e
                }}
              />
              {errors.research_goals && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.research_goals.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Datos criticos */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-semibold">Datos criticos</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Informacion especifica que el AI debe obtener de cada
                participante.
              </p>
              <Textarea
                className="mt-3"
                rows={4}
                {...register('critical_data_points')}
              />
              {errors.critical_data_points && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.critical_data_points.message}
                </p>
              )}

              {/* Critical paths sub-section */}
              <div className="mt-6">
                <Label className="text-sm font-semibold">
                  Caminos criticos
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si el participante menciona un tema, que debe explorar el AI?
                </p>

                <div className="mt-3 space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                    >
                      <span className="text-sm text-muted-foreground shrink-0">
                        Si
                      </span>
                      <Input
                        className="flex-1"
                        placeholder="el participante menciona..."
                        {...register(`critical_paths.${index}.trigger`)}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">
                        entonces explorar
                      </span>
                      <Input
                        className="flex-1"
                        placeholder="profundizar en..."
                        {...register(`critical_paths.${index}.exploration`)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => remove(index)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {fields.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={() => append({ trigger: '', exploration: '' })}
                  >
                    <Plus className="mr-1 size-4" />
                    Agregar camino
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Contexto y antecedentes */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-semibold">
                Contexto y antecedentes
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Que debe saber el AI sobre el tema, la empresa o el proyecto?
              </p>
              <Textarea
                className="mt-3"
                rows={4}
                {...register('context_background')}
              />
              {errors.context_background && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.context_background.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Tono y enfoque */}
          <Card>
            <CardContent className="p-6">
              <Label className="text-sm font-semibold">Tono y enfoque</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Como debe manejar la conversacion el AI?
              </p>
              <Textarea
                className="mt-3"
                rows={3}
                {...register('tone_approach')}
              />
              {errors.tone_approach && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.tone_approach.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview button */}
        <div className="mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPreviewOpen(true)}
          >
            Vista previa
          </Button>
        </div>
      </form>

      <BriefPreviewDialog
        brief={watchedValues}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
