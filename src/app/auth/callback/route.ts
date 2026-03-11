import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const response = NextResponse.redirect(`${origin}/form`, { status: 308 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.exchangeCodeForSession(code)

  if (data.user) {
    await supabaseAdmin
        .from('users')
        .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.user_metadata?.full_name ?? null,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

        await supabaseAdmin
        .from('subscriptions')
        .upsert({
            user_id: data.user.id,
            plan: 'free',
            status: 'active',
        }, { onConflict: 'user_id', ignoreDuplicates: true })
  }

  return response
}