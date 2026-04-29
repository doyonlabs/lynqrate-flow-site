import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: entries }, { data: emotions }] = await Promise.all([
    supabaseAdmin
      .from('emotion_entries')
      .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50),
    supabaseAdmin
      .from('standard_emotions')
      .select('name, color_code')
      .order('soft_order'),
  ])

  const decryptedEntries = (entries ?? []).map(e => ({
    ...e,
    trigger_text: e.trigger_text ? safeDecrypt(e.trigger_text) : null,
    summary: e.summary ? safeDecrypt(e.summary) : null,
  }))

  return NextResponse.json({ entries: decryptedEntries, emotions: emotions ?? [] })
}