import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const payload = await req.json()
  const { eventType, object } = payload

  const userId = object?.metadata?.user_id
  if (!userId) {
    return NextResponse.json({ error: 'No user_id in metadata' }, { status: 400 })
  }

  if (eventType === 'subscription.active') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  if (eventType === 'subscription.canceled' || eventType === 'subscription.expired') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  return NextResponse.json({ received: true })
}