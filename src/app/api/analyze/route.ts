import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[\u00A0\u200B\uFEFF]/g, '')
    .replace(/\s+/g, '')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(req: NextRequest) {
  try {
    // 1) 로그인 유저 확인
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    // 2) 요청 바디 파싱
    const body = await req.json()
    const { emotion, intensity, story, feedbackType, tone } = body

    // 3) 필수값 검증
    const textFields: Record<string, string> = { emotion, story, feedbackType, tone }
    for (const [key, value] of Object.entries(textFields)) {
      if (!value || normalizeWhitespace(value).length === 0) {
        return Response.json({ error: `missing_field_${key}` }, { status: 400 })
      }
    }
    if (!intensity || intensity < 1 || intensity > 5) {
      return Response.json({ error: 'missing_field_intensity' }, { status: 400 })
    }

    // 4) 입력값 정리
    const cleanEmotion = escapeHtml(emotion.trim())
    const cleanStory = escapeHtml(story.trim())

    // 5) GPT 호출
    const payload = {
      raw_emotion: cleanEmotion,
      emotion_level: intensity,
      situation_summary: cleanStory,
      feedback_style: feedbackType,
      speech_style: tone,
    }

    const systemPrompt = `너는 감정 코치다.
규칙:
- 출력: 한국어 공백 포함 150~250자. 최저 글자 수보다 적게 출력하지 말 것.
- 구조: ①새로운 관찰 또는 패턴(핵심) ②공감 한 줄 ③오늘 당장 할 행동
- situation_summary가 짧거나 단편적일 경우, 맥락을 추론해 자연스럽게 확장하되 사실을 왜곡하지 말 것.
- 반드시 사용자의 입력에서 새로운 관찰·트리거·패턴 중 최소 1개 이상을 뽑아 반영한다.
- 제안은 모호하지 않고, 오늘 당장 시도할 수 있는 작은 행동(예: "5분 산책하기", "한 줄 기록하기")으로 작성한다.
- 피상적 문구(예: "관계 발전", "중요한 역할")는 쓰지 않는다.
- feedback_style과 speech_style에 따라 뉘앙스를 조정한다.
- 명령형, 이모지, 해시태그는 쓰지 않는다.
- 입력의 키 이름은 출력에 포함하지 말 것.
출력 형식(JSON):
{"feedback_text": "텍스트"}`

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    })

    if (!gptResponse.ok) {
      const err = await gptResponse.json()
      console.error('GPT error:', err)
      return Response.json({ error: 'gpt_error' }, { status: 500 })
    }

    const gptData = await gptResponse.json()
    const raw = gptData.choices?.[0]?.message?.content ?? '{}'

    let feedbackText = ''
    try {
      const parsed = JSON.parse(raw)
      feedbackText = parsed.feedback_text ?? ''
    } catch {
      feedbackText = raw
    }

    if (!feedbackText) {
      return Response.json({ error: 'empty_feedback' }, { status: 500 })
    }

    // 6) TODO: DB 저장 — DB 연결 후 아래 주석 해제
    // const { data: entry } = await supabase.from('emotion_entries').insert({
    //   user_id: user.id,
    //   raw_emotion: emotion.trim(),
    //   intensity,
    //   story: story.trim(),
    //   feedback_type: feedbackType,
    //   tone,
    // }).select().single()
    // await supabase.from('emotion_feedbacks').insert({
    //   entry_id: entry.id,
    //   user_id: user.id,
    //   feedback: feedbackText,
    // })

    return Response.json({
      status: 'ok',
      feedback: feedbackText,
    })

  } catch (err) {
    console.error('analyze error:', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}