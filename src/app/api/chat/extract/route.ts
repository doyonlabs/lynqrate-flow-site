import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const EXTRACT_PROMPT = `아래는 사용자와 AI 감정 코치의 대화 기록입니다.
대화 전체를 분석해서 다음 항목을 JSON으로만 반환하세요.
Markdown, 설명, 추가 텍스트 없이 JSON 객체만 반환하세요.

반환 형식:
{
  "emotion": "불안/무기력/분노/슬픔/외로움/두려움/설렘/기쁨/감사/평온 중 하나만. 이 외 단어 절대 사용 금지.",
  "intensity": 1~5 숫자 (1: 약함, 5: 매우 강함),
  "trigger": "감정을 유발한 상황이나 맥락 한 문장 (없으면 빈 문자열)",
  "summary": "AI 코치로서 오늘 대화를 따뜻하게 한두 문장으로 정리 (사용자에게 직접 말하는 형식)"
}

규칙:
- emotion은 반드시 위 10개 중 하나. 절대 다른 단어 사용 금지.
- 가장 핵심적인 감정 하나만 선택. 복합 감정이면 더 강한 쪽으로.
- intensity 판단 기준: 사용자 표현의 강도, 반복성, 상황의 심각도를 종합
- trigger는 사실 기반으로, 판단이나 평가 없이 간결하게
- summary는 공감과 따뜻함을 담되 번역체 금지`

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

  const conversationText = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === 'assistant' ? 'AI' : '사용자'}: ${m.content}`
    )
    .join('\n')

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: EXTRACT_PROMPT,
          },
          {
            role: 'user',
            content: `다음 대화를 분석해주세요:\n\n---\n${conversationText}\n---`,
          },
        ],
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content ?? '{}'

    let extracted
    try {
      extracted = JSON.parse(raw)
    } catch {
      extracted = { emotion: '알 수 없음', intensity: 3, trigger: '', summary: '오늘 대화를 나눠줘서 고마워요.' }
    }

    // emotion_entries DB 저장
    await supabaseAdmin
      .from('emotion_entries')
      .insert({
        user_id: user.id,
        chat_session_id: sessionId ?? null,
        raw_emotion: extracted.emotion,
        intensity: extracted.intensity,
        trigger_text: extracted.trigger ?? null,
        summary: extracted.summary ?? null,
      })

    // chat_sessions.ended_at 업데이트
    if (sessionId) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json(extracted)
  } catch (err) {
    console.error('[/api/chat/extract] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}