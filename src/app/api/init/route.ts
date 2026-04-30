import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    { data: sessions },
    { data: emotions },
    { data: dashboardData },
  ] = await Promise.all([
    supabaseAdmin
      .from('chat_sessions')
      .select('id, title, started_at, ended_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString())
      .order('created_at', { ascending: true }),
  ])

  return NextResponse.json({
    sessions: (sessions ?? []).map(s => ({
      ...s,
      title: s.title ? safeDecrypt(s.title) : null,
    })),
    emotions: emotions ?? [],
    dashboardEntries: dashboardData ?? [],
  })
}