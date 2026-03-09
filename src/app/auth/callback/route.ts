import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const response = NextResponse.redirect(`${origin}/form`)

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (existingUser) {
        await supabaseAdmin
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data.user.id)
      } else {
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

  return response
}