import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-[28px] font-semibold leading-[1.15] text-foreground">
          EntrevistaAI
        </h1>
        <p className="max-w-md text-lg text-foreground/90">
          Entrevistas de investigacion con IA a escala
        </p>
        <p className="max-w-lg text-sm text-muted-foreground">
          Realiza entrevistas profesionales 24/7, en cualquier zona horaria, a
          90% menos costo que entrevistadores humanos.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Crear cuenta
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ya tienes cuenta? Iniciar sesion
          </Link>
        </div>
      </div>
    </div>
  )
}
