'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeMember } from '@/app/(dashboard)/settings/actions'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'

export type Member = {
  user_id: string
  email: string | null
  name: string | null
  role: string
}

type MembersListProps = {
  members: Member[]
  currentUserId: string
  isOwner: boolean
}

export function MembersList({
  members,
  currentUserId,
  isOwner,
}: MembersListProps) {
  const router = useRouter()
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!confirmRemove) return
    setRemoving(true)
    try {
      const result = await removeMember(confirmRemove.user_id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Miembro eliminado')
        router.refresh()
      }
    } finally {
      setRemoving(false)
      setConfirmRemove(null)
    }
  }

  function getRoleBadgeClass(role: string) {
    if (role === 'owner') {
      return 'bg-primary/20 text-primary'
    }
    return 'bg-muted text-muted-foreground'
  }

  function getDisplayName(member: Member) {
    return member.name || member.email || member.user_id.slice(0, 8)
  }

  function getInitial(member: Member) {
    const display = member.name || member.email || member.user_id
    return display.charAt(0).toUpperCase()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center gap-3 rounded-lg p-2"
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {getInitial(member)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {getDisplayName(member)}
              </p>
              {member.name && member.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              )}
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${getRoleBadgeClass(member.role)}`}
            >
              {member.role}
            </span>
            {isOwner &&
              member.user_id !== currentUserId &&
              member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmRemove(member)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar miembro</DialogTitle>
            <DialogDescription>
              Esta acción eliminará a {confirmRemove ? getDisplayName(confirmRemove) : ''}{' '}
              de la organización. No podrá acceder a las campañas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemove(null)}
              disabled={removing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
