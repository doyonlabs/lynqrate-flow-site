import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('chat_sessions')
    .select('id, title, started_at, ended_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (!data) return NextResponse.json({ sessions: [] })

  const decrypted = data.map(s => ({
    ...s,
    title: s.title ? safeDecrypt(s.title) : null,
  }))

  return NextResponse.json({ sessions: decrypted })
}