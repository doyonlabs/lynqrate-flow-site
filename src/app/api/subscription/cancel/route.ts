import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('creem_subscription_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.creem_subscription_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const baseUrl = process.env.CREEM_API_KEY?.includes('test')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'

  const res = await fetch(`${baseUrl}/v1/subscriptions/${sub.creem_subscription_id}/cancel`, {
    method: 'POST',
    headers: {
        'x-api-key': process.env.CREEM_API_KEY!,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'scheduled' }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('Creem cancel error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}