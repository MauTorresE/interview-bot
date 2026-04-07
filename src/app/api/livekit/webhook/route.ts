import { NextRequest, NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { createAdminClient } from '@/lib/supabase/admin'

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const authHeader = req.headers.get('authorization') || ''

  let event
  try {
    event = await receiver.receive(body, authHeader)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  if (event.event === 'egress_ended' && event.egressInfo) {
    const roomName = event.egressInfo.roomName
    if (roomName?.startsWith('interview-')) {
      const interviewId = roomName.replace('interview-', '')
      const fileResults = event.egressInfo.fileResults
      if (fileResults && fileResults.length > 0) {
        const recordingUrl = fileResults[0].filename
        const admin = createAdminClient()
        await admin
          .from('interviews')
          .update({ recording_url: recordingUrl })
          .eq('id', interviewId)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
