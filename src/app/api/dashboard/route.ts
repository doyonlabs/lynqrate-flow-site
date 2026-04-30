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

  const [{ data: entries }, { data: recentData }, { data: emotions }] = await Promise.all([
    (() => {
      let query = supabaseAdmin
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (start) query = query.gte('created_at', new Date(start).toISOString())
      if (end) query = query.lt('created_at', new Date(end).toISOString())
      return query
    })(),
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
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
    emotions: emotions ?? [],
  })
}