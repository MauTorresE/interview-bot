import { FileBarChart } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col p-8 md:p-8 p-4">
      <h1 className="text-xl font-semibold text-foreground">Reportes</h1>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <FileBarChart className="size-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Sin reportes aún
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Los reportes aparecerán aquí cuando completes tus primeras
            entrevistas.
          </p>
        </div>
      </div>
    </div>
  )
}
