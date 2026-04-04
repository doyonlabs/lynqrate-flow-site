import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.CREEM_API_KEY?.includes('test')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'

  // 고객 목록 조회 후 이메일로 필터
  const customerRes = await fetch(`${baseUrl}/v1/customers/list`, {
    headers: { 'x-api-key': process.env.CREEM_API_KEY! },
  })

  const customerData = await customerRes.json()
  const customer = customerData?.items?.find((c: any) => c.email === user.email)

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // 포털 링크 생성
  const portalRes = await fetch(`${baseUrl}/v1/customers/billing`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CREEM_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customer_id: customer.id }),
  })

  const portalData = await portalRes.json()
  return NextResponse.json({ portal_url: portalData.customer_portal_link })
}