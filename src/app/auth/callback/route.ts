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
        // 이미 있으면 updated_at만 업데이트, 없으면 새로 생성
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single()

        if (existingUser) {
            // 이미 있으면 updated_at만 업데이트
            await supabaseAdmin
                .from('users')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', data.user.id)
        } else {
            // 없으면 새로 생성
            await supabaseAdmin
                .from('users')
                .insert({
                    id: data.user.id,
                    email: data.user.email,
                    is_guest: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
        }
    }
  }

  return NextResponse.redirect(`${origin}/form`)
}