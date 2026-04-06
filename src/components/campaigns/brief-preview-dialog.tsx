'use client'

import type { ResearchBriefOutput } from '@/lib/validations/campaign'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type BriefPreviewDialogProps = {
  brief: ResearchBriefOutput
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BriefPreviewDialog({
  brief,
  open,
  onOpenChange,
}: BriefPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista previa de la guia</DialogTitle>
        </DialogHeader>

        <div className="font-mono text-sm space-y-6 py-4">
          {/* Section 1: Research Goals */}
          {brief.research_goals && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Objetivos de investigacion
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {brief.research_goals}
              </p>
            </div>
          )}

          {/* Section 2: Critical Data Points */}
          {brief.critical_data_points && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Datos criticos
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {brief.critical_data_points}
              </p>
            </div>
          )}

          {/* Critical Paths */}
          {brief.critical_paths && brief.critical_paths.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Caminos criticos
              </h3>
              <ul className="text-muted-foreground space-y-1">
                {brief.critical_paths.map((path, index) => (
                  <li key={index}>
                    - Si {path.trigger}, explorar {path.exploration}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 3: Context */}
          {brief.context_background && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Contexto y antecedentes
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {brief.context_background}
              </p>
            </div>
          )}

          {/* Section 4: Tone */}
          {brief.tone_approach && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Tono y enfoque
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {brief.tone_approach}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
