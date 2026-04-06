'use client'

import { useState } from 'react'
import { deleteRespondent, sendReminder } from '@/app/(dashboard)/campaigns/[id]/actions'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { StatusBadge } from './status-badge'
import { AddRespondentDialog } from './add-respondent-dialog'
import { Copy, Link, Loader2, MoreVertical, Users } from 'lucide-react'

type Respondent = {
  id: string
  name: string
  email: string | null
  notes: string | null
  invite_token: string
  status: string
  interview_date: string | null
  created_at: string
}

type RespondentsTabProps = {
  campaignId: string
  respondents: Respondent[]
  reusableInviteToken: string | null
  reusableInviteEnabled: boolean
}

export function RespondentsTab({
  campaignId,
  respondents,
  reusableInviteToken,
  reusableInviteEnabled,
}: RespondentsTabProps) {
  const [deleteTarget, setDeleteTarget] = useState<Respondent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)

  async function handleCopyLink(inviteToken: string) {
    const url = `${window.location.origin}/interview/${inviteToken}`
    await navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  async function handleCopyReusableLink() {
    if (!reusableInviteToken) return
    const url = `${window.location.origin}/interview/${reusableInviteToken}`
    await navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  async function handleSendReminder(respondentId: string) {
    setSendingReminder(respondentId)
    const result = await sendReminder(campaignId, respondentId)
    setSendingReminder(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Recordatorio enviado')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await deleteRespondent(campaignId, deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Participante eliminado')
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'd MMM yyyy', { locale: es })
    } catch {
      return '-'
    }
  }

  // Empty state
  if (respondents.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <Users className="size-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            Sin participantes aún
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Agrega participantes para comenzar a recopilar respuestas.
          </p>
        </div>
        <AddRespondentDialog
          campaignId={campaignId}
          trigger={<Button className="mt-2">Agregar participante</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          Participantes ({respondents.length})
        </h2>
        <div className="flex items-center gap-2">
          <AddRespondentDialog
            campaignId={campaignId}
            trigger={<Button size="sm">Agregar</Button>}
          />
          {reusableInviteEnabled && reusableInviteToken && (
            <Popover>
              <PopoverTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <Link className="mr-1 size-4" />
                Enlace
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-sm">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Enlace reutilizable</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/interview/${reusableInviteToken}`
                        : `/interview/${reusableInviteToken}`}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyReusableLink}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {respondents.map((respondent) => (
            <TableRow
              key={respondent.id}
              className="hover:bg-muted/50 transition-colors duration-150"
            >
              <TableCell className="font-medium">{respondent.name}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground truncate max-w-[200px]">
                {respondent.email ?? '-'}
              </TableCell>
              <TableCell>
                <StatusBadge status={respondent.status} variant="respondent" />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(
                  respondent.status === 'completed'
                    ? respondent.interview_date
                    : respondent.created_at
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" className="size-8" />}
                  >
                    {sendingReminder === respondent.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreVertical className="size-4" />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleCopyLink(respondent.invite_token)}
                    >
                      Copiar enlace
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSendReminder(respondent.id)}
                    >
                      Enviar recordatorio
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(respondent)}
                    >
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar participante</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a {deleteTarget?.name} de la campaña. Si
              tiene una entrevista en progreso, se cancelará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
