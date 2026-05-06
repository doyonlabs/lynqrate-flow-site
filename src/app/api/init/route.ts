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

  const startOfData = startOfThisWeek < startOfMonth ? startOfThisWeek : startOfMonth

  const [
    { data: sessions },
    { data: emotions },
    { data: allEntries },
    { data: userData },
    { data: subData },
    { count: totalEntryCount },
    { data: recentData },
  ] = await Promise.all([
    // chat_sessions 3개 → 1개
    supabaseAdmin
      .from('chat_sessions')
      .select('id, title, started_at, ended_at, last_extracted_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
    // emotion_entries 6개 → 1개
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, trigger_text, summary, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfLastWeek.toISOString())
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
    // isFirstSession 판단용 — 데이터 없이 카운트만
    supabaseAdmin
      .from('emotion_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, trigger_text, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // JS에서 파생
  const entries = allEntries ?? []
  const dashboardEntries = entries.filter(e => new Date(e.created_at) >= startOfData)
  const thisWeekEntries = entries.filter(e => new Date(e.created_at) >= startOfThisWeek)
  const lastWeekEntries = entries.filter(e =>
    new Date(e.created_at) >= startOfLastWeek &&
    new Date(e.created_at) < startOfThisWeek
  )
  const monthlyCount = entries.filter(e => e.created_at.startsWith(yearMonth)).length

  // chat_sessions JS 파생
  const allSessions = sessions ?? []
  const nullSessions = allSessions.filter(s => !s.last_extracted_at)
  const newMessageSessions = allSessions.filter(s =>
    s.last_extracted_at && new Date(s.last_extracted_at) < new Date(s.updated_at)
  )
  const uniqueIncomplete = [...nullSessions, ...newMessageSessions].filter(
    (s, index, self) => self.findIndex(t => t.id === s.id) === index
  )

  const decryptEntry = (e: typeof entries[0]) => ({
    ...e,
    trigger_text: e.trigger_text ? safeDecrypt(e.trigger_text) : null,
    summary: e.summary ? safeDecrypt(e.summary) : null,
  })

  return NextResponse.json({
    sessions: allSessions.map(s => ({
      ...s,
      title: s.title ? safeDecrypt(s.title) : null,
    })),
    emotions: emotions ?? [],
    dashboardEntries: dashboardEntries.map(decryptEntry),
    userInfo: userData ?? null,
    subscription: subData ?? null,
    monthlyCount,
    isFirstSession: !totalEntryCount || totalEntryCount === 0,
    incompleteSessions: uniqueIncomplete,
    thisWeekEntries: thisWeekEntries.map(decryptEntry),
    lastWeekEntries: lastWeekEntries.map(decryptEntry),
    recentEntries: (recentData ?? []).map(decryptEntry),
  })
}