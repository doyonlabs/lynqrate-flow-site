import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.CREEM_API_KEY?.startsWith('test_')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'

  const response = await fetch(`${baseUrl}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CREEM_API_KEY!,
    },
    body: JSON.stringify({
      product_id: process.env.CREEM_PRODUCT_ID!,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/form?upgraded=true`,
      metadata: {
        user_id: user.id,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Creem error:', response.status, errorBody)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  const data = await response.json()
  return NextResponse.json({ checkout_url: data.checkout_url })
}