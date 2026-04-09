import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const interviewId = req.nextUrl.searchParams.get('interviewId')
  if (!interviewId) {
    return NextResponse.json({ error: 'missing_interview_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: entries, error } = await admin
    .from('transcript_entries')
    .select('id, speaker, content, elapsed_ms')
    .eq('interview_id', interviewId)
    .order('elapsed_ms', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  return NextResponse.json({ entries: entries ?? [] })
}
