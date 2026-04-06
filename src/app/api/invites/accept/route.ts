import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_invite', request.url)
    )
  }

  // Look up invite using admin client (bypasses RLS)
  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin
    .from('org_invites')
    .select('id, org_id, email')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invite) {
    // Token not found, expired, or already used
    return NextResponse.redirect(
      new URL('/auth/login?error=invite_expired', request.url)
    )
  }

  // Check if user is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in -- redirect to signup with invite token
    return NextResponse.redirect(
      new URL(`/auth/signup?invite=${token}`, request.url)
    )
  }

  // User is authenticated -- accept the invite

  // Check if already a member
  const { data: existingMember } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    // Already a member, just mark invite accepted and redirect
    await admin
      .from('org_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Switch to the invited org
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { org_id: invite.org_id },
    })

    return NextResponse.redirect(new URL('/campaigns', request.url))
  }

  // 1. Insert org membership
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: 'member',
  })

  if (memberError) {
    return NextResponse.redirect(
      new URL('/auth/login?error=invite_failed', request.url)
    )
  }

  // 2. Mark invite as accepted
  await admin
    .from('org_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 3. Update user's app_metadata to the new org
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { org_id: invite.org_id },
  })

  // 4. Redirect to dashboard
  return NextResponse.redirect(new URL('/campaigns', request.url))
}
