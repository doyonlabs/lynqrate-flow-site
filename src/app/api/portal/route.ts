import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.CREEM_API_KEY?.includes('test')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('creem_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.creem_customer_id) {
    return NextResponse.json({ error: 'No customer found' }, { status: 404 })
  }

  const portalRes = await fetch(`${baseUrl}/v1/customers/billing`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CREEM_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: sub.creem_customer_id }),
  })

  const portalData = await portalRes.json()
  return NextResponse.json({ portal_url: portalData.customer_portal_link })
}