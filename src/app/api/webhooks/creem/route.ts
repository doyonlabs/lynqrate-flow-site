import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

function verifySignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.CREEM_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex')
  return expected === signature
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('creem-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const { eventType, object } = payload

  // refund.created는 object.customer.id 기반으로 처리 (metadata.user_id 없음)
  if (eventType === 'refund.created') {
    const subscriptionId = object?.subscription?.id
    const userId = object?.subscription?.metadata?.user_id

    if (!subscriptionId) {
      return NextResponse.json({ received: true })
    }

    // Creem 구독 즉시 취소 (안 하면 다음 달 재결제 시도됨)
    const baseUrl = process.env.CREEM_API_KEY?.includes('test')
      ? 'https://test-api.creem.io/v1'
      : 'https://api.creem.io/v1'

    await fetch(`${baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CREEM_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'immediate' }),
    })

    // DB free로 초기화
    const query = supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'active',
        expires_at: null,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (userId) {
      await query.eq('user_id', userId)
    } else {
      await query.eq('creem_subscription_id', subscriptionId)
    }

    return NextResponse.json({ received: true })
  }

  const userId = object?.metadata?.user_id
  if (!userId) {
    console.error('No user_id in metadata', payload)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // 구독 활성화
  if (eventType === 'subscription.active') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        creem_customer_id: object?.customer?.id ?? null,
        creem_subscription_id: object?.id ?? null,
        expires_at: object?.current_period_end_date ?? null,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  // 갱신 결제 성공 — expires_at 업데이트
  if (eventType === 'subscription.paid') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan: 'pro',
        status: 'active',
        expires_at: object?.current_period_end_date ?? null,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  // 구독 취소 — 환불로 인한 canceled는 refund.created에서 처리(plan free 체크로 스킵)
  // scheduled_cancel 만료 시 free 초기화, 즉시 취소 시 canceled 상태로 만료일까지 유지
  if (eventType === 'subscription.canceled') {
    const expiresAt = object?.current_period_end_date

    const { data: current } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()

    if (current?.plan !== 'pro') {
      // 이미 환불로 free 처리된 경우 스킵
    } else if (current?.status === 'scheduled_cancel') {
      // scheduled_cancel 만료 → 완전히 free로 초기화
      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'active',
          expires_at: null,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    } else {
      // 즉시 취소 → canceled 상태로 만료일까지 유지
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: object?.canceled_at ?? new Date().toISOString(),
          expires_at: expiresAt ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }
  }

  // 구독 취소 예약 — 만료일까지 Pro 유지, Resume으로 철회 가능
  if (eventType === 'subscription.scheduled_cancel') {
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'scheduled_cancel',
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