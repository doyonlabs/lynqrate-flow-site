import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  // 이번주/지난주 기간 계산 (KST 기준)
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const kstDay = kstNow.getUTCDay()
  const startOfThisWeekKST = new Date(kstNow.getTime() - kstDay * 24 * 60 * 60 * 1000)
  startOfThisWeekKST.setUTCHours(0, 0, 0, 0)
  const startOfThisWeek = new Date(startOfThisWeekKST.getTime() - kstOffset)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const [{ data: entries }, { data: recentData }, { data: thisWeekData }, { data: lastWeekData }, { data: emotions }] = await Promise.all([
    (() => {
      let query = supabaseAdmin
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (start) query = query.gte('created_at', new Date(`${start}T00:00:00+09:00`).toISOString())
      if (end) query = query.lt('created_at', new Date(`${end}T00:00:00+09:00`).toISOString())
      return query
    })(),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary')
      .eq('user_id', user.id)
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
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
  ])

  return NextResponse.json({
    entries: entries ?? [],
    recentEntries: (recentData ?? []).map(e => ({
      ...e,
      summary: e.summary ? safeDecrypt(e.summary) : null,
    })),
    thisWeekEntries: thisWeekData ?? [],
    lastWeekEntries: lastWeekData ?? [],
    emotions: emotions ?? [],
  })
}