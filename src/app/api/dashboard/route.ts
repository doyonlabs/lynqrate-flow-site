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

  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const kstDay = kstNow.getUTCDay()
  const startOfThisWeekKST = new Date(kstNow.getTime() - kstDay * 24 * 60 * 60 * 1000)
  startOfThisWeekKST.setUTCHours(0, 0, 0, 0)
  const startOfThisWeek = new Date(startOfThisWeekKST.getTime() - kstOffset)
  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const [{ data: entries }, { data: currentData }, { data: emotions }] = await Promise.all([
    // 히트맵용 — start/end 기간
    (() => {
      let query = supabaseAdmin
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, trigger_text, summary, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (start) query = query.gte('created_at', new Date(`${start}T00:00:00+09:00`).toISOString())
      if (end) query = query.lt('created_at', new Date(`${end}T00:00:00+09:00`).toISOString())
      return query
    })(),
    // thisWeek/lastWeek/recent 통합 — 지난주부터 현재까지
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, trigger_text, summary, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfLastWeek.toISOString())
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
  ])

  // JS에서 파생
  const current = currentData ?? []
  const thisWeekEntries = current.filter(e => new Date(e.created_at) >= startOfThisWeek)
  const lastWeekEntries = current.filter(e =>
    new Date(e.created_at) >= startOfLastWeek &&
    new Date(e.created_at) < startOfThisWeek
  )
  const recentEntries = [...current].reverse().slice(0, 5)

  const decryptEntry = (e: typeof current[0]) => ({
    ...e,
    trigger_text: e.trigger_text ? safeDecrypt(e.trigger_text) : null,
    summary: e.summary ? safeDecrypt(e.summary) : null,
  })

  return NextResponse.json({
    entries: (entries ?? []).map(decryptEntry),
    recentEntries: recentEntries.map(decryptEntry),
    thisWeekEntries: thisWeekEntries.map(decryptEntry),
    lastWeekEntries: lastWeekEntries.map(decryptEntry),
    emotions: emotions ?? [],
  })
}