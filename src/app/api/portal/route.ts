import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 이메일로 Creem customer 조회
  const customerRes = await fetch(
    `https://test-api.creem.io/v1/customers?email=${encodeURIComponent(user.email!)}`,
    {
      headers: {
        'x-api-key': process.env.CREEM_API_KEY!,
      },
    }
  )

  const customerData = await customerRes.json()
  const customerId = customerData?.items?.[0]?.id

  if (!customerId) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // 포털 링크 생성
  const portalRes = await fetch('https://test-api.creem.io/v1/customers/billing', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CREEM_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: customerId }),
  })

  const portalData = await portalRes.json()
  return NextResponse.json({ portal_url: portalData.customer_portal_link })
}