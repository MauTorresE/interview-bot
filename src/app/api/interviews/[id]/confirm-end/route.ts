'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/interviews/[id]/confirm-end
 *
 * Wave 3.1: REST fallback for confirming interview completion.
 *
 * Used when the data channel is unavailable (network drop, agent crash,
 * restored-modal-after-refresh). The frontend fires this alongside the
 * data channel message so at least one path marks the interview completed.
 *
 * Idempotent: if the interview is already completed, returns { ok: true,
 * alreadyCompleted: true }. Only transitions from 'active' status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { duration?: number; reason?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body is optional — default to empty
  }

  const admin = createAdminClient()

  // Validate interview exists
  const { data: interview } = await admin
    .from('interviews')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (!interview) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Already completed — idempotent success
  if (interview.status === 'completed') {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // Only transition from active
  if (interview.status !== 'active') {
    return NextResponse.json(
      { error: 'invalid_status', current: interview.status },
      { status: 409 }
    )
  }

  // Mark completed
  const { error } = await admin
    .from('interviews')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
      duration_seconds: body.duration ?? 0,
      closing_reason: 'fallback',
    })
    .eq('id', id)
    .eq('status', 'active') // Optimistic lock — only transition from active

  if (error) {
    // If the update affected 0 rows, another path already completed it
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  return NextResponse.json({ ok: true })
}
