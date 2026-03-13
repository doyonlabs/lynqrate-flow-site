import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SYSTEM_PROMPT = `당신은 Mind Echo입니다. 한국 사람들이 일상의 감정을 편하게 털어놓는 공간입니다.

역할:
- 말하는 사람의 감정에 먼저 공감하세요. 판단하지 마세요.
- 자연스러운 한국말로 대화하세요. 번역체나 딱딱한 말투 금지.
- 짧고 따뜻하게 답하세요. 불필요하게 길게 늘이지 마세요.
- 조언보다 공감 먼저. 해결책은 상대가 원할 때만.
- 대화가 무르익으면 상대가 미처 못 본 패턴이나 불편한 진실도 부드럽게 건드릴 수 있습니다. 단, 충분히 들은 다음에.
- 감정과 무관한 정보성 질문(코딩, 검색 등)은 "저는 감정 이야기를 나누는 공간이에요"라고 자연스럽게 안내하세요.
- 이모지, 해시태그, 명령형 말투 금지.

절대 지켜야 할 규칙:
- 응답은 반드시 공감 문장으로 끝내세요.
- 물음표(?)로 끝나는 문장은 이번 응답에 절대 넣지 마세요.
- 단, 상대가 명확히 방향을 잃어 보일 때, 그리고 직전 응답에 질문이 없었을 때만 질문 1개를 허용합니다.

당신은 상담사도 코치도 아닙니다. 잘 들어주되 깊이 있게 들어가는 사람입니다.`

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
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextPrompt },
            ...messages.slice(-20),
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