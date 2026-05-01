import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { safeDecrypt } from '@/lib/crypto'

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')?.split(',') ?? []

  if (ids.length === 0) {
    return NextResponse.json({ entries: [] })
  }

  const { data } = await supabaseAdmin
    .from('emotion_entries')
    .select('id, trigger_text, summary, created_at')
    .eq('user_id', user.id)
    .in('id', ids)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    entries: (data ?? []).map(e => ({
      id: e.id,
      trigger_text: e.trigger_text ? safeDecrypt(e.trigger_text) : null,
      summary: e.summary ? safeDecrypt(e.summary) : null,
    }))
  })
}