'use client'

import { useState } from 'react'
import { recordConsent, recordConsentForReusableLink } from './actions'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

type ConsentFormProps = {
  token: string
  tokenType: 'respondent' | 'campaign'
  campaignName: string
}

const CONSENT_ITEMS = [
  'Acepto que esta entrevista sera grabada en audio para su posterior analisis.',
  'Acepto que mis respuestas seran procesadas por inteligencia artificial para generar insights de investigacion.',
  'Entiendo que mis datos seran tratados de forma confidencial y anonimizada en los reportes finales.',
] as const

export function ConsentForm({ token, tokenType, campaignName }: ConsentFormProps) {
  const [checks, setChecks] = useState([false, false, false])
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const allChecked = checks.every(Boolean)
  const nameValid = tokenType === 'campaign' ? name.trim().length > 0 : true
  const canSubmit = allChecked && nameValid && !isSubmitting

  function handleCheck(index: number, checked: boolean) {
    setChecks((prev) => {
      const next = [...prev]
      next[index] = checked
      return next
    })
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)

    const result =
      tokenType === 'respondent'
        ? await recordConsent(token)
        : await recordConsentForReusableLink(token, name.trim())

    setIsSubmitting(false)

    if (result.error) {
      const messages: Record<string, string> = {
        invalid: 'Este enlace de entrevista no es valido o ha expirado.',
        already_used: 'Este enlace ya fue utilizado.',
        campaign_archived: 'Esta campana ya no esta activa.',
      }
      toast.error(messages[result.error] ?? result.error)
    } else {
      setIsComplete(true)
    }
  }

  if (isComplete) {
    return (
      <Card className="w-full max-w-[560px]">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            Entrevista lista
          </h1>
          <p className="text-sm text-muted-foreground">
            Tu consentimiento ha sido registrado. La entrevista comenzara pronto.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-[560px]">
      <CardContent className="p-8">
        {/* Logo */}
        <div className="mb-12 text-center">
          <span className="text-xl font-semibold text-primary">
            EntrevistaAI
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-foreground text-center mb-2">
          Bienvenido a tu entrevista
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          Antes de comenzar, necesitamos tu consentimiento para lo siguiente:
        </p>

        {/* Name input for reusable links */}
        {tokenType === 'campaign' && (
          <div className="mb-6 flex flex-col gap-2">
            <Label htmlFor="consent-name">Tu nombre</Label>
            <Input
              id="consent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Consent checkboxes */}
        <div className="flex flex-col gap-4 mb-8">
          {CONSENT_ITEMS.map((item, index) => (
            <label
              key={index}
              className="flex items-start gap-3 cursor-pointer"
            >
              <Checkbox
                checked={checks[index]}
                onCheckedChange={(checked) => handleCheck(index, checked === true)}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground leading-relaxed">
                {item}
              </span>
            </label>
          ))}
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full h-12 transition-colors duration-200 ${
            !canSubmit
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Procesando...
            </>
          ) : (
            'Comenzar entrevista'
          )}
        </Button>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Al continuar, aceptas los terminos de uso.
        </p>
      </CardContent>
    </Card>
  )
}
