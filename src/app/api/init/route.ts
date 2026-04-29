import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: sessions },
    { data: entries },
    { data: emotions },
    { data: lastData },
    { data: dashboardEntries },
  ] = await Promise.all([
    supabaseAdmin
      .from('chat_sessions')
      .select('id, title, started_at, ended_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
      .eq('user_id', user.id)
      .lt('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50),
  ])

  const decrypt = (e: any) => ({
    ...e,
    trigger_text: e.trigger_text ? safeDecrypt(e.trigger_text) : null,
    summary: e.summary ? safeDecrypt(e.summary) : null,
  })

  return NextResponse.json({
    sessions: (sessions ?? []).map(s => ({
      ...s,
      title: s.title ? safeDecrypt(s.title) : null,
    })),
    todayEntries: (entries ?? []).map(decrypt),
    emotions: emotions ?? [],
    lastEntry: lastData?.[0] ? decrypt(lastData[0]) : null,
    dashboardEntries: (dashboardEntries ?? []).map(decrypt),
  })
}