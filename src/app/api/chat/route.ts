import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SYSTEM_PROMPT = `당신은 Mind Echo입니다.
사용자가 오늘 느낀 감정을 편하게 털어놓는 공간입니다.

- 자연스러운 한국말로 짧게 답하세요. 2~3문장이면 충분합니다.
- 뻔한 위로는 하지 마세요.
- 감정 이야기를 중심으로 대화를 이어가세요.
- 결론으로 마무리하지 마세요. 사용자가 더 말하고 싶어지는 여운을 남기세요.
- 질문은 3번 중 1번 이하로만 하세요.
- 항상 존댓말을 유지하세요.`

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

  // 월별 사용량 체크 (무료 플랜 — 추출 월 10회 제한)
  const yearMonth = new Date().toISOString().slice(0, 7)

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status, expires_at')
    .eq('user_id', user.id)
    .single()

  const isPro = sub?.plan === 'pro' && (
    sub.status === 'active' ||
    (['canceled', 'scheduled_cancel'].includes(sub.status) && sub.expires_at && new Date(sub.expires_at) > new Date())
  )

  if (!isPro) {
    const { count } = await supabaseAdmin
      .from('emotion_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${yearMonth}-01`)

    if ((count ?? 0) >= 10) {
      return NextResponse.json({ error: 'limit_exceeded' }, { status: 429 })
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

    // 세션 updated_at 갱신
    await supabaseAdmin
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId)
  }

  try {
    const { data: recentEmotions } = await supabaseAdmin
        .from('emotion_entries')
        .select('raw_emotion, intensity, trigger_text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

    const contextPrompt = recentEmotions?.length
        ? `\n\n이 사용자의 최근 감정 기록:\n` +
        recentEmotions.map(e =>
            `- ${e.raw_emotion} (강도 ${e.intensity})${e.trigger_text ? `: ${e.trigger_text}` : ''}`
        ).join('\n')
        : ''

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
            ...messages.slice(-20),
        ],
        max_tokens: 500,
        temperature: 0.7,
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