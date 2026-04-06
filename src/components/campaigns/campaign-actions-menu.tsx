'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { archiveCampaign } from '@/app/(dashboard)/campaigns/[id]/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, MoreHorizontal } from 'lucide-react'

type CampaignActionsMenuProps = {
  campaignId: string
  campaignName: string
}

export function CampaignActionsMenu({ campaignId, campaignName }: CampaignActionsMenuProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  async function handleArchive() {
    setIsArchiving(true)
    const result = await archiveCampaign(campaignId)
    setIsArchiving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Campaña archivada')
      router.push('/campaigns')
    }
    setArchiveOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Editar detalles</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setArchiveOpen(true)}
          >
            Archivar campaña
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar campaña</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción archivará la campaña &ldquo;{campaignName}&rdquo;. Las entrevistas activas no serán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isArchiving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Archivando...
                </>
              ) : (
                'Archivar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
