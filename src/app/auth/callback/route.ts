import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (existingUser) {
        // 기존 유저 — updated_at 갱신
        await supabaseAdmin
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data.user.id)
      } else {
        // 신규 유저 — users 생성 + subscriptions free 플랜 생성
        await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.full_name ?? null,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: data.user.id,
            plan: 'free',
            status: 'active',
          })
      }
    }
  }

  return NextResponse.redirect(`${origin}/form`)
}