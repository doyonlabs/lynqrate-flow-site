import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SYSTEM_PROMPT = `당신은 Mind Echo입니다. 한국 사람들이 감정을 털어놓는 공간입니다.
말하는 사람의 말을 먼저 충분히 듣고, 그 사람의 언어로 공감하세요.`

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages, sessionId } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  // 월별 사용량 체크 (무료 플랜 — 신규 세션 월 5회 제한)
    const yearMonth = new Date().toISOString().slice(0, 7)

    const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

    if (!sub || sub.plan === 'free') {
    if (!sessionId) {
        // 신규 세션일 때만 체크
        const { count } = await supabaseAdmin
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${yearMonth}-01`)

        if ((count ?? 0) >= 5) {
        return NextResponse.json({ error: 'limit_exceeded' }, { status: 429 })
        }
    }
    }

    // 세션 없으면 새로 생성
    let currentSessionId = sessionId
    if (!currentSessionId) {
    const firstUserMessage = messages.find((m: { role: string }) => m.role === 'user')
    const title = firstUserMessage?.content?.slice(0, 30) ?? null

    const { data: session, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({ user_id: user.id, title })
        .select('id')
        .single()

    if (error || !session) {
      console.error('[/api/chat] session create error:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }
    currentSessionId = session.id
  }

  // 유저 메시지 저장 (마지막 메시지)
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage?.role === 'user') {
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_session_id: currentSessionId,
        user_id: user.id,
        role: 'user',
        content: lastUserMessage.content,
      })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
        max_tokens: 500,
        temperature: 0.85,
      }),
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content ?? '답장을 가져오지 못했어요.'

    // AI 답변 저장
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_session_id: currentSessionId,
        user_id: user.id,
        role: 'assistant',
        content: reply,
      })

    return NextResponse.json({ reply, sessionId: currentSessionId })
  } catch (err) {
    console.error('[/api/chat] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}