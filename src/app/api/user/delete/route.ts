import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, creem_subscription_id')
    .eq('user_id', user.id)
    .single()

  if (sub?.plan === 'pro' && (sub?.status === 'active' || sub?.status === 'scheduled_cancel') && sub?.creem_subscription_id) {
    const baseUrl = process.env.CREEM_API_KEY?.includes('test')
      ? 'https://test-api.creem.io' 
      : 'https://api.creem.io'

    await fetch(`${baseUrl}/v1/subscriptions/${sub.creem_subscription_id}/cancel`, {
      method: 'POST',
      headers: { 
        'x-api-key': process.env.CREEM_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'immediate' }),
    })
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}