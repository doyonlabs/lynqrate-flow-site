import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const payload = await req.json()
  console.log('webhook payload:', JSON.stringify(payload, null, 2))
  const { eventType, object } = payload

  const userId = object?.metadata?.user_id
  if (!userId) {
    return NextResponse.json({ error: 'No user_id in metadata' }, { status: 400 })
  }

  // 구독 활성화
  if (eventType === 'subscription.active') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: object?.current_period_end_date ?? null,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  // 구독 취소 예약 — 만료일까지 Pro 유지, 만료 시 subscription.expired 이벤트로 free 전환
  if (eventType === 'subscription.canceled') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: object?.canceled_at ?? new Date().toISOString(),
        expires_at: object?.current_period_end_date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  // 기간 만료 — 완전히 free로 초기화
  if (eventType === 'subscription.expired') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'active',
        expires_at: null,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  return NextResponse.json({ received: true })
}