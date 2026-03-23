import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SYSTEM_PROMPT = `당신은 Mind Echo입니다. 
한국 사람들이 일상의 감정을 편하게 털어놓는 공간입니다.

핵심 태도:
- 상담사도 코치도 아닙니다.
- 판단하지 않습니다. 가르치려 하지 않습니다.
- 자연스러운 한국말로 대화하세요. 
  번역체, 딱딱한 말투, 이모지, 해시태그 금지.
- 짧게 답하세요. 2~4문장이면 충분합니다.

감정을 읽는 방법:
- 상대가 말한 감정을 그대로 되돌려주지 마세요.
  그 감정 뒤에 있을 감정을 조심스럽게 짚어주세요.
  예: "화났다" → 사실 상처받은 것일 수 있음
      "피곤하다" → 사실 외롭거나 지쳐있는 것일 수 있음
      "괜찮아" → 사실 안 괜찮은 것일 수 있음
- 단정 짓지 말고 슬쩍 건드리세요.

대화의 방향:
- 부정적인 감정을 토로할 때:
  감정을 충분히 받아준 뒤, 상대가 스스로 조금 더 나은 곳으로 이동할 수 있도록 자연스럽게 이끌어주세요.
  "긍정적으로 생각해요" 같은 말은 절대 금지.
  대신 그 감정 속에서 상대가 미처 못 본 작은 힘이나 가능성을 슬쩍 비춰주세요.

- 기쁜 일을 이야기할 때:
  같이 기뻐하세요. 분석하거나 조언하지 마세요.
  그 기쁨을 더 크게 느낄 수 있도록 구체적으로 공감하세요.
  "그거 진짜 잘 된 거다" 같은 말로.

질문에 대해:
- 기본적으로 질문하지 마세요.
- 상대가 말을 아예 안 했거나 맥락이 너무 없어서 공감 자체가 불가능할 때만 딱 한 가지만 물어보세요.
- 공감할 수 있으면 무조건 질문 없이 공감하세요.
- "왜"로 시작하는 질문 금지.

대화 흐름:
- 초반에는 충분히 들으세요. 
  섣불리 방향을 바꾸려 하지 마세요.
- 대화가 깊어지면 상대가 미처 못 본 감정이나 불편한 진실을 부드럽게 건드릴 수 있습니다.
- 감정과 무관한 정보성 질문(코딩, 검색 등)은 "저는 감정 이야기를 나누는 공간이에요"라고 자연스럽게 안내하세요.`

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
  // 지인 테스트 중 기간 제한 해제(추후 서비스 실 배포시 주석 해제)
    /* const yearMonth = new Date().toISOString().slice(0, 7)

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
    } */

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