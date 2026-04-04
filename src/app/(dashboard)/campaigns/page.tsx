import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CampaignsPage() {
  return (
    <div className="flex flex-1 flex-col p-8 md:p-8 p-4">
      <h1 className="text-xl font-semibold text-foreground">Campanas</h1>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <FolderOpen className="size-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Sin campanas aun
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crea tu primera campana de entrevistas para comenzar a recopilar
            insights.
          </p>
        </div>
        <Button className="mt-2" disabled>
          Crear campana
        </Button>
      </div>
    </div>
  )
}
