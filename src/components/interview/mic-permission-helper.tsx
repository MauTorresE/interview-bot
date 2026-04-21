'use client'

/**
 * MicPermissionHelper — Wave 4.2
 *
 * Shows browser-specific instructions for enabling microphone access when
 * getUserMedia fails with NotAllowedError. Includes a Retry button that
 * re-requests permission and a Reload button as fallback.
 *
 * Also exports SilentMicHelper: a checklist card shown when the mic is
 * granted but no audio is detected for 7+ seconds (hardware mute, wrong
 * device, OS-level block).
 */

import { Mic, MicOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Browser = 'chrome' | 'safari-ios' | 'safari-mac' | 'firefox' | 'edge' | 'other'

function detectBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  // Check Chromium-family and Firefox first — their UAs contain "Safari" as a
  // legacy substring, so Safari detection must come last to avoid false positives.
  if (/Edg\//.test(ua)) return 'edge'
  if (/CriOS/.test(ua)) return 'chrome'             // Chrome on iOS
  if (/FxiOS/.test(ua)) return 'firefox'            // Firefox on iOS
  if (/Firefox/.test(ua)) return 'firefox'
  if (/Chrome|Chromium/.test(ua)) return 'chrome'
  if (/iPhone|iPad/.test(ua) && /Safari/.test(ua)) return 'safari-ios'
  if (/Safari/.test(ua)) return 'safari-mac'
  return 'other'
}

const INSTRUCTIONS: Record<Browser, string> = {
  'chrome': 'Haz click en el icono del candado en la barra de direcciones, luego en "Configuracion del sitio", y cambia Microfono a "Permitir". Despues recarga esta pagina.',
  'safari-ios': 'Ve a Ajustes > Safari > Microfono y permite el acceso para este sitio. Despues recarga esta pagina.',
  'safari-mac': 'En Safari, ve a Ajustes del sitio web > Microfono y selecciona "Permitir". Despues recarga esta pagina.',
  'firefox': 'Haz click en el icono del candado en la barra de direcciones, luego en Permisos > Usar el microfono > Permitir. Despues recarga.',
  'edge': 'Haz click en el icono del candado en la barra de direcciones, luego en "Permisos para este sitio" y cambia Microfono a "Permitir". Despues recarga.',
  'other': 'Habilita el microfono en la configuracion de tu navegador para este sitio, luego recarga la pagina.',
}

type MicPermissionHelperProps = {
  onRetry: () => void
}

export function MicPermissionHelper({ onRetry }: MicPermissionHelperProps) {
  const browser = detectBrowser()
  const instructions = INSTRUCTIONS[browser]

  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <MicOff className="size-6 text-destructive" aria-hidden="true" />
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Necesitamos acceso a tu microfono
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {instructions}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Mic className="size-4 mr-1.5" />
          Reintentar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4 mr-1.5" />
          Recargar pagina
        </Button>
      </div>
    </div>
  )
}

type SilentMicHelperProps = {
  onDismiss: () => void
}

export function SilentMicHelper({ onDismiss }: SilentMicHelperProps) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
      <div className="flex items-center gap-2">
        <Mic className="size-4 text-amber-500" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">
          No detectamos audio
        </span>
      </div>

      <ul className="text-xs text-muted-foreground space-y-1.5 ml-6 list-disc">
        <li>Verifica que tu microfono no este silenciado (boton fisico o del sistema)</li>
        <li>Si usas audifonos, verifica que esten conectados correctamente</li>
        <li>Intenta seleccionar otro microfono en el selector de arriba</li>
        <li>Cierra otras aplicaciones que puedan estar usando el microfono</li>
      </ul>

      <Button variant="ghost" size="sm" className="self-end" onClick={onDismiss}>
        Entendido
      </Button>
    </div>
  )
}
