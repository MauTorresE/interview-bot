import { NextRequest, NextResponse } from 'next/server'
import { AccessToken, RoomServiceClient, EgressClient, EncodedFileOutput, S3Upload } from 'livekit-server-sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { VOICE_PERSONAS } from '@/lib/constants/campaign'

export async function POST(req: NextRequest) {
  let body: { token?: string; respondentId?: string; rejoin?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { token, respondentId, rejoin } = body
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Step 1: Look up respondent — by ID (reusable link flow) or by invite_token (direct link flow)
  type Respondent = { id: string; status: string; campaign_id: string; name: string; org_id: string }

  const query = respondentId
    ? admin.from('respondents').select('id, status, campaign_id, name, org_id').eq('id', respondentId).single()
    : admin.from('respondents').select('id, status, campaign_id, name, org_id').eq('invite_token', token).single()

  const { data: respondentData } = await query
  const respondent = respondentData as Respondent | null

  if (!respondent) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Step 2: Verify status === 'in_progress' (consent given)
  if (respondent.status !== 'in_progress') {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 })
  }

  // Step 3: Check for existing active interview
  const { data: existing } = await admin
    .from('interviews')
    .select('id')
    .eq('respondent_id', respondent.id)
    .eq('status', 'active')
    .maybeSingle()

  // If rejoin requested and active interview exists, generate new token for same room
  if (existing && rejoin) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('duration_target_minutes, voice_id')
      .eq('id', respondent.campaign_id)
      .single()

    const duration = (campaign?.duration_target_minutes as number) ?? 15
    const voiceId = (campaign?.voice_id as string) ?? 'voxtral-natalia'
    const persona = VOICE_PERSONAS.find(p => p.id === voiceId)
    const personaName = persona?.name ?? 'Natalia'

    const roomName = `interview-${existing.id}`
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: respondent.id as string, name: (respondent.name as string) || 'Participante' },
    )
    at.addGrant({ roomJoin: true, room: roomName })
    const livekitToken = await at.toJwt()

    return NextResponse.json({
      token: livekitToken,
      roomName,
      interviewId: existing.id,
      wsUrl: process.env.LIVEKIT_URL!,
      campaignInfo: { duration, personaName },
    })
  }

  // Not a rejoin — block duplicate sessions
  if (existing) {
    return NextResponse.json({ error: 'already_active' }, { status: 409 })
  }

  // Look up campaign info for campaignInfo in response
  const { data: campaign } = await admin
    .from('campaigns')
    .select('duration_target_minutes, voice_id')
    .eq('id', respondent.campaign_id)
    .single()

  const duration = (campaign?.duration_target_minutes as number) ?? 15
  const voiceId = (campaign?.voice_id as string) ?? 'voxtral-natalia'
  const persona = VOICE_PERSONAS.find(p => p.id === voiceId)
  const personaName = persona?.name ?? 'Natalia'

  // Step 4: Create interview row + LiveKit room + return token
  const { data: interview, error: insertError } = await admin
    .from('interviews')
    .insert({
      campaign_id: respondent.campaign_id,
      respondent_id: respondent.id,
      org_id: respondent.org_id,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !interview) {
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  const roomName = `interview-${interview.id}`

  // Create LiveKit room
  // RoomServiceClient needs HTTPS URL, not WSS
  const livekitHost = process.env.LIVEKIT_URL!.replace('wss://', 'https://').replace('ws://', 'http://')
  const roomService = new RoomServiceClient(
    livekitHost,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  )
  await roomService.createRoom({ name: roomName, emptyTimeout: 300 })

  // Start Egress (fire-and-forget per D-23)
  try {
    const egressClient = new EgressClient(
      livekitHost,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    )

    const s3Output = new S3Upload({
      accessKey: process.env.SUPABASE_S3_ACCESS_KEY!,
      secret: process.env.SUPABASE_S3_SECRET_KEY!,
      bucket: 'recordings',
      endpoint: process.env.SUPABASE_S3_ENDPOINT!,
      region: process.env.SUPABASE_S3_REGION || 'us-east-1',
      forcePathStyle: true,
    })

    const fileOutput = new EncodedFileOutput({
      filepath: `interviews/${interview.id}.mp4`,
      output: { case: 's3', value: s3Output },
    })

    await egressClient.startRoomCompositeEgress(roomName, fileOutput)
  } catch (e) {
    console.error('Egress start failed (non-blocking per D-23):', e)
  }

  // Generate participant token
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: respondent.id as string, name: (respondent.name as string) || 'Participante' },
  )
  at.addGrant({ roomJoin: true, room: roomName })
  const livekitToken = await at.toJwt()

  return NextResponse.json({
    token: livekitToken,
    roomName,
    interviewId: interview.id,
    wsUrl: process.env.LIVEKIT_URL!,
    campaignInfo: {
      duration,
      personaName,
    },
  })
}
