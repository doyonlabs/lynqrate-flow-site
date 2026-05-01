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
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

  const [
    { data: sessions },
    { data: emotions },
    { data: dashboardData },
    { data: userData },
    { data: subData },
    { count: monthlyCount },
    { count: totalEntryCount },
    { data: nullSessions },
    { data: incompleteSessions },
    { data: thisWeekData },
    { data: lastWeekData },
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
    supabaseAdmin
      .from('users')
      .select('display_name, email')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('subscriptions')
      .select('plan, status, expires_at, creem_customer_id')
      .eq('user_id', user.id)
      .single(),
    supabaseAdmin
      .from('emotion_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${yearMonth}-01`),
    supabaseAdmin
      .from('emotion_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .is('last_extracted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('chat_sessions')
      .select('id, last_extracted_at, updated_at')
      .eq('user_id', user.id)
      .not('last_extracted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfThisWeek.toISOString())
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfLastWeek.toISOString())
      .lt('created_at', startOfThisWeek.toISOString())
      .order('created_at', { ascending: true }),
  ])

  const newMessageSessions = incompleteSessions?.filter(s =>
    new Date(s.last_extracted_at!) < new Date(s.updated_at)
  ) ?? []

  return NextResponse.json({
    sessions: (sessions ?? []).map(s => ({
      ...s,
      title: s.title ? safeDecrypt(s.title) : null,
    })),
    emotions: emotions ?? [],
    dashboardEntries: dashboardData ?? [],
    userInfo: userData ?? null,
    subscription: subData ?? null,
    monthlyCount: monthlyCount ?? 0,
    isFirstSession: !totalEntryCount || totalEntryCount === 0,
    incompleteSessions: [
      ...(nullSessions ?? []),
      ...newMessageSessions,
    ],
    thisWeekEntries: thisWeekData ?? [],
    lastWeekEntries: lastWeekData ?? [],
  })
}