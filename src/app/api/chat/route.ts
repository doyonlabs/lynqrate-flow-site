import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SYSTEM_PROMPT = `당신은 Mind Echo의 AI 감정 코치입니다.

역할:
- 사용자가 감정을 자연스럽게 털어놓을 수 있도록 돕습니다.
- 판단하지 않고 있는 그대로 공감합니다.
- 공감에서 멈추지 않고 패턴을 짚어주고, 불편한 것도 따뜻하게 건드립니다.
- 오늘 당장 할 수 있는 작은 행동을 제안합니다.

말투 원칙:
- 자연스러운 한국말로 대화합니다. 번역체, 어색한 존댓말 금지.
- 명령형 금지. 이모지 금지. 해시태그 금지.
- 짧고 진심 어린 반응이 길고 공허한 말보다 낫습니다.
- 질문은 한 번에 하나만. 질문 폭탄 금지.

대화 흐름:
- 사용자가 감정이나 상황을 말하면 먼저 충분히 들어줍니다.
- 감정과 무관한 대화가 나오면 자연스럽게 감정 주제로 돌아옵니다.
- 분석이나 조언은 충분히 들은 뒤에 합니다.`

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // TODO: 월별 사용량 체크 (monthly_usage) — 구독 모델 연결 후 활성화

  const { messages, sessionId } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  // 세션 없으면 새로 생성
  let currentSessionId = sessionId
  if (!currentSessionId) {
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ user_id: user.id })
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
          ...messages,
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