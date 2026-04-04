import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 구독 중이면 Creem 구독 취소
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .single()

  if (sub?.plan === 'pro' && sub?.status === 'active') {
    // Creem에서 구독 ID 조회 후 취소
    const baseUrl = process.env.CREEM_API_KEY?.startsWith('test_') 
      ? 'https://test-api.creem.io' 
      : 'https://api.creem.io'

    const subsRes = await fetch(`${baseUrl}/v1/subscriptions/list`, {
      headers: { 'x-api-key': process.env.CREEM_API_KEY! },
    })
    const subsData = await subsRes.json()
    const subscription = subsData?.items?.find((s: any) => 
      s.metadata?.user_id === user.id && s.status === 'active'
    )

    if (subscription) {
      await fetch(`${baseUrl}/v1/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.CREEM_API_KEY! },
      })
    }
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}