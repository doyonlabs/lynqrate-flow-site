import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { encrypt, safeDecrypt } from '@/lib/crypto'

const STANDARD_EMOTIONS = ['불안', '무기력', '분노', '슬픔', '외로움', '두려움', '설렘', '기쁨', '감사', '평온']

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
- "공허함"→"무기력", "짜증"→"분노", "걱정"→"불안", "우울"→"슬픔", "무서움"→"두려움" 처럼 가장 가까운 감정으로 매핑.
- 가장 핵심적인 감정 하나만 선택. 복합 감정이면 더 강한 쪽으로.
- intensity 판단 기준: 사용자 표현의 강도, 반복성, 상황의 심각도를 종합.
- trigger는 사실 기반으로, 판단이나 평가 없이 간결하게.
- summary는 공감과 따뜻함을 담되 번역체 금지.
- 대화에서 "사용자:"로 시작하는 발화만 기준으로 감정 추출. "AI:"로 시작하는 발화는 맥락 파악용으로만 참고.
- 사용자가 긍정으로 표현했다면 부정 맥락이 있어도 긍정 감정 우선.`

const MIN_USER_MESSAGES = 5 // 최소 유저 메시지 수

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, force } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const { data: sessionData } = await supabaseAdmin
    .from('chat_sessions')
    .select('last_extracted_at')
    .eq('id', sessionId)
    .single()

  const lastExtractedAt = sessionData?.last_extracted_at

  let query = supabaseAdmin
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('chat_session_id', sessionId)
    .order('created_at', { ascending: true })

  if (lastExtractedAt) {
    query = query.gt('created_at', lastExtractedAt)
  }

  const { data: newMessages } = await query

  if (!newMessages || newMessages.length === 0) {
    return NextResponse.json({ error: 'no new messages' }, { status: 400 })
  }

  if (!force) {
    const userMessageCount = newMessages.filter(m => m.role === 'user').length
    if (userMessageCount < MIN_USER_MESSAGES) {
      return NextResponse.json({ error: 'not enough messages' }, { status: 400 })
    }
  }

  // 복호화 후 GPT에 전달
  const conversationText = newMessages
    .map(m => `${m.role === 'assistant' ? 'AI' : '사용자'}: ${safeDecrypt(m.content)}`)
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
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: `다음 대화를 분석해주세요:\n\n---\n${conversationText}\n---` },
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
      extracted = { emotion: null, intensity: 3, trigger: '', summary: '오늘 대화를 나눠줘서 고마워요.' }
    }

    if (!STANDARD_EMOTIONS.includes(extracted.emotion)) {
      await supabaseAdmin
        .from('chat_sessions')
        .update({
          last_extracted_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      return NextResponse.json({ skipped: true })
    }

    // trigger_text, summary 암호화 저장
    await supabaseAdmin
      .from('emotion_entries')
      .insert({
        user_id: user.id,
        chat_session_id: sessionId,
        raw_emotion: extracted.emotion,
        intensity: extracted.intensity,
        trigger_text: extracted.trigger ? encrypt(extracted.trigger) : null,
        summary: extracted.summary ? encrypt(extracted.summary) : null,
      })

    await supabaseAdmin
      .from('chat_sessions')
      .update({
        last_extracted_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json(extracted)
  } catch (err) {
    console.error('[/api/chat/extract] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}