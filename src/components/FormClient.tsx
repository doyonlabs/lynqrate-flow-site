'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

const STEPS = [
  {
    id: 1, key: 'emotion',
    question: '지금 느끼는 감정을 한 단어로 적어주세요.',
    sub: '예: 불안, 슬픔, 설렘, 억울함 (10자 이내)',
    type: 'text', maxLength: 10,
  },
  {
    id: 2, key: 'intensity',
    question: '그 감정이 얼마나 강하게 느껴지나요?',
    sub: '1(약하게) ~ 5(매우 강하게)',
    type: 'intensity',
  },
  {
    id: 3, key: 'story',
    question: '오늘 있었던 일과 감정을 자유롭게 적어주세요.',
    sub: '20자 이상 500자 이하',
    type: 'textarea', minLength: 20, maxLength: 500,
  },
  {
    id: 4, key: 'feedbackType',
    question: '어떤 피드백을 받고 싶으신가요?',
    sub: '하나를 선택해주세요',
    type: 'select',
    options: ['공감과 위로', '통찰과 확장', '용기와 격려', '행동 제안', '함께 기뻐하기'],
  },
  {
    id: 5, key: 'tone',
    question: '어떤 말투로 피드백을 받고 싶으신가요?',
    sub: '하나를 선택해주세요',
    type: 'select',
    options: ['격식체', '존중체', '친근체', '직설체'],
  },
]

const HISTORY = [
  { date: '3월 5일', emotion: '불안', intensity: 4 },
  { date: '3월 4일', emotion: '무기력', intensity: 3 },
  { date: '3월 2일', emotion: '설렘', intensity: 4 },
  { date: '2월 28일', emotion: '외로움', intensity: 2 },
]

// 라인 아이콘 SVG
const Icons = {
  menu: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  plus: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  chart: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9"/>
      <rect x="10" y="7" width="4" height="14"/>
      <rect x="17" y="3" width="4" height="18"/>
    </svg>
  ),
  settings: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logout: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  back: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
}

type View = 'form' | 'settings' | 'dashboard'

export default function FormClient() {
  const { isDark, toggleTheme } = useTheme()
  const [view, setView] = useState<View>('form')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const t = isDark ? dark : light
  const current = STEPS[step]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [step, feedback, analyzing])

  const getValue = () => answers[current?.key] ?? ''
  const setValue = (v: any) => setAnswers({ ...answers, [current?.key]: v })

  const canNext = () => {
    const v = getValue()
    if (!current) return false
    if (current.type === 'text') {
      const norm = v.replace(/[\u00A0\u200B\uFEFF]/g, '').replace(/\s+/g, '')
      return norm.length >= 1 && v.length <= 10
    }
    if (current.type === 'intensity') return v >= 1 && v <= 5
    if (current.type === 'textarea') return v.length >= 20 && v.length <= 500
    if (current.type === 'select') return !!v
    return false
  }

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      setSubmitted(true)
      setAnalyzing(true)
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emotion: answers.emotion,
            intensity: answers.intensity,
            story: answers.story,
            feedbackType: answers.feedbackType,
            tone: answers.tone,
          }),
        })
        const data = await res.json()
        setFeedback(data.feedback ?? '피드백을 가져오지 못했어요.')
      } catch {
        setFeedback('오류가 발생했어요. 다시 시도해주세요.')
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const handleNewRecord = () => {
    setStep(0)
    setAnswers({})
    setSubmitted(false)
    setAnalyzing(false)
    setFeedback('')
    setView('form')
  }

  const messages = STEPS.slice(0, submitted ? STEPS.length : step + 1).map((s) => ({
    question: s.question,
    answer: answers[s.key],
    key: s.key,
  }))

  const AIBubble = () => (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: '#fff',
    }}>✦</div>
  )

  const SidebarItem = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} style={{
      width: '100%', padding: '9px 12px', borderRadius: 8,
      background: active ? t.hover : 'transparent',
      border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
      textAlign: 'left',
    }}>
      {icon}
      <span style={{ fontSize: 13, color: active ? t.text : t.muted }}>{label}</span>
    </button>
  )

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: t.bg, color: t.text,
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s, color 0.3s',
    }}>

      {/* 사이드바 — 열림 */}
      {sidebarOpen && (
        <div style={{
          width: 260, flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column',
          background: t.sidebar, transition: 'background 0.3s',
        }}>
          <div style={{ padding: '16px 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', flexShrink: 0,
              }}>✦</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Mind Echo</span>
            </div>
            <button onClick={handleNewRecord} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.text, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {Icons.plus(t.text)} 새 기록
            </button>
          </div>

          <div style={{ padding: '0 8px 8px' }}>
            <SidebarItem
              icon={Icons.chart(view === 'dashboard' ? t.text : t.muted)}
              label="대시보드"
              active={view === 'dashboard'}
              onClick={() => setView('dashboard')}
            />
            <div style={{ height: 1, background: t.border, margin: '8px 4px' }} />
          </div>

          <div style={{ padding: '0 8px', flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: 11, color: t.muted, padding: '0 8px', marginBottom: 6, letterSpacing: '0.06em' }}>최근 기록</p>
            {HISTORY.map((h, i) => (
              <div key={i} style={{
                padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{h.emotion}</div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{h.date} · 강도 {h.intensity}</div>
              </div>
            ))}
          </div>

          {/* 하단 사용자/설정 */}
          <div style={{ padding: '8px', position: 'relative' }} ref={settingsRef}>
            {settingsOpen && (
              <div style={{
                position: 'absolute', bottom: 60, left: 8, right: 8,
                background: t.popup, border: `1px solid ${t.border}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 100,
              }}>
                <button
                  onClick={() => { setSettingsOpen(false); setView('settings') }}
                  style={{
                    width: '100%', padding: '11px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 'none',
                    color: t.text, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {Icons.settings(t.muted)}
                  <span>설정</span>
                </button>
                <div style={{ height: 1, background: t.border }} />
                <button style={{
                  width: '100%', padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: '#f87171', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                  {Icons.logout('#f87171')}
                  <span>로그아웃</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 10,
                background: settingsOpen ? t.hover : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff', flexShrink: 0, fontWeight: 600,
              }}>도</div>
              <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>도영</div>
                <div style={{ fontSize: 11, color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>user@gmail.com</div>
              </div>
              <span style={{ color: t.muted, fontSize: 12 }}>···</span>
            </button>
          </div>
        </div>
      )}

      {/* 사이드바 — 닫힘 */}
      {!sidebarOpen && (
        <div style={{
          width: 52, flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: t.sidebar, paddingTop: 12, paddingBottom: 12, gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', marginBottom: 8,
          }}>✦</div>
          <button onClick={handleNewRecord} title="새 기록" style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: `1px solid ${t.border}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icons.plus(t.muted)}</button>
          <button onClick={() => setView('dashboard')} title="대시보드" style={{
            width: 32, height: 32, borderRadius: 8,
            background: view === 'dashboard' ? t.hover : 'transparent',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icons.chart(t.muted)}</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => { setSidebarOpen(true); setSettingsOpen(true) }} title="설정" style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#fff', fontWeight: 600, fontFamily: 'inherit',
          }}>도</button>
        </div>
      )}

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{
          height: 52, borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          background: t.bg,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>{Icons.menu(t.muted)}</button>
          <span style={{ fontSize: 14, color: t.muted }}>
            {view === 'settings' ? '설정'
              : view === 'dashboard' ? '대시보드'
              : feedback ? '분석 완료'
              : analyzing ? 'AI 분석 중...'
              : `감정 기록 · ${step + 1} / ${STEPS.length}`}
          </span>
          {view === 'form' && (
            <div style={{ flex: 1, height: 2, borderRadius: 1, background: t.border, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: feedback ? '100%' : `${((step + (canNext() ? 1 : 0)) / STEPS.length) * 100}%`,
                background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                transition: 'width 0.4s ease',
              }} />
            </div>
          )}
          {view !== 'form' && <div style={{ flex: 1 }} />}
          {view !== 'form' && (
            <button onClick={() => setView('form')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            }}>{Icons.back(t.muted)}</button>
          )}
        </div>

        {/* 폼 뷰 */}
        {view === 'form' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0', background: t.bg }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

                {messages.slice(0, submitted ? messages.length : messages.length - 1).map((m, i) => (
                  <div key={i} style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <AIBubble />
                      <div style={{
                        background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                        padding: '12px 16px', fontSize: 14, lineHeight: 1.6, color: t.text, maxWidth: '80%',
                      }}>{m.question}</div>
                    </div>
                    {m.answer && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{
                          background: '#7c3aed', borderRadius: '16px 4px 16px 16px',
                          padding: '12px 16px', fontSize: 14, lineHeight: 1.6, color: '#fff', maxWidth: '80%',
                        }}>
                          {typeof m.answer === 'number' ? `강도 ${m.answer}` : m.answer}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {analyzing && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                    <AIBubble />
                    <div style={{
                      background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                      padding: '12px 16px', fontSize: 14, color: t.muted,
                    }}>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        <span style={{ animation: 'blink 1.2s infinite' }}>●</span>
                        <span style={{ animation: 'blink 1.2s 0.4s infinite' }}>●</span>
                        <span style={{ animation: 'blink 1.2s 0.8s infinite' }}>●</span>
                      </span>
                    </div>
                  </div>
                )}

                {feedback && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                    <AIBubble />
                    <div style={{
                      background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                      padding: '16px 20px', fontSize: 14, lineHeight: 1.8, color: t.text,
                      maxWidth: '80%',
                    }}>
                      {feedback}
                      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={handleNewRecord} style={{
                          padding: '8px 16px', borderRadius: 20,
                          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                          border: 'none', color: '#fff', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {Icons.plus('#fff')} 새 기록하기
                        </button>
                        <button onClick={() => setView('dashboard')} style={{
                          padding: '8px 16px', borderRadius: 20,
                          background: 'transparent', border: `1px solid ${t.border}`,
                          color: t.muted, fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {Icons.chart(t.muted)} 대시보드
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!submitted && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <AIBubble />
                      <div>
                        <div style={{
                          background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                          padding: '12px 16px', fontSize: 14, lineHeight: 1.6, color: t.text, marginBottom: 6,
                        }}>{current.question}</div>
                        <div style={{ fontSize: 12, color: t.muted, paddingLeft: 4 }}>{current.sub}</div>
                      </div>
                    </div>

                    <div style={{ paddingLeft: 40 }}>
                      {current.type === 'text' && (
                        <input
                          value={getValue()}
                          onChange={e => setValue(e.target.value)}
                          maxLength={10}
                          placeholder="감정 단어를 입력하세요..."
                          style={{
                            width: '100%', padding: '12px 16px', borderRadius: 12,
                            background: t.input, border: `1px solid ${t.border}`,
                            color: t.text, fontSize: 14, outline: 'none',
                            boxSizing: 'border-box', fontFamily: 'inherit',
                          }}
                          onFocus={e => e.target.style.borderColor = '#a78bfa'}
                          onBlur={e => e.target.style.borderColor = t.border}
                          onKeyDown={e => e.key === 'Enter' && canNext() && handleNext()}
                        />
                      )}
                      {current.type === 'intensity' && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setValue(n)} style={{
                              width: 52, height: 52, borderRadius: 12,
                              background: getValue() === n ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : t.input,
                              border: `1px solid ${getValue() === n ? '#a78bfa' : t.border}`,
                              color: getValue() === n ? '#fff' : t.muted,
                              fontSize: 15, fontWeight: 600, cursor: 'pointer',
                              transition: 'all 0.2s', fontFamily: 'inherit',
                            }}>{n}</button>
                          ))}
                        </div>
                      )}
                      {current.type === 'textarea' && (
                        <div>
                          <textarea
                            value={getValue()}
                            onChange={e => setValue(e.target.value)}
                            maxLength={500}
                            placeholder="자유롭게 적어주세요..."
                            style={{
                              width: '100%', minHeight: 140, padding: '12px 16px',
                              borderRadius: 12, background: t.input,
                              border: `1px solid ${t.border}`, color: t.text,
                              fontSize: 14, lineHeight: 1.7, resize: 'none',
                              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                            }}
                            onFocus={e => e.target.style.borderColor = '#a78bfa'}
                            onBlur={e => e.target.style.borderColor = t.border}
                          />
                          <div style={{
                            fontSize: 12, color: getValue().length < 20 ? '#f87171' : t.muted,
                            textAlign: 'right', marginTop: 4,
                          }}>
                            {getValue().length} / 500자{getValue().length < 20 ? ` (${20 - getValue().length}자 더 입력)` : ''}
                          </div>
                        </div>
                      )}
                      {current.type === 'select' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {current.options?.map(opt => (
                            <button key={opt} onClick={() => setValue(opt)} style={{
                              padding: '10px 16px', borderRadius: 20,
                              background: getValue() === opt ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : t.input,
                              border: `1px solid ${getValue() === opt ? '#a78bfa' : t.border}`,
                              color: getValue() === opt ? '#fff' : t.text,
                              fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                              fontWeight: getValue() === opt ? 500 : 400, fontFamily: 'inherit',
                            }}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {!submitted && (
              <div style={{ padding: '12px 24px', background: t.bg, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} style={{
                    padding: '10px 18px', borderRadius: 10,
                    background: 'none', border: `1px solid ${t.border}`,
                    color: t.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}>← 이전</button>
                )}
                <button onClick={handleNext} disabled={!canNext()} style={{
                  padding: '10px 24px', borderRadius: 10,
                  background: canNext() ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : t.input,
                  border: 'none', color: canNext() ? '#fff' : t.muted,
                  fontSize: 13, fontWeight: 500,
                  cursor: canNext() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                }}>
                  {step < STEPS.length - 1 ? '다음 →' : '✦ 분석 시작'}
                </button>
              </div>
            )}
          </>
        )}

        {/* 설정 뷰 */}
        {view === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', background: t.bg }}>
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>

              <p style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 12 }}>화면</p>
              <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 32 }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>다크 모드</div>
                    <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{isDark ? '다크 모드 사용 중' : '라이트 모드 사용 중'}</div>
                  </div>
                  <button onClick={toggleTheme} style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: isDark ? '#a78bfa' : '#d1d5db',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: isDark ? 23 : 3,
                      transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 12 }}>계정</p>
              <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>도영</div>
                    <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>user@gmail.com</div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#fff', fontWeight: 600,
                  }}>도</div>
                </div>
                <div style={{ height: 1, background: t.border }} />
                <button style={{
                  width: '100%', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: '#f87171', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                  {Icons.logout('#f87171')} 로그아웃
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 대시보드 뷰 (임시) */}
        {view === 'dashboard' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>{Icons.chart(t.muted)}</div>
              <p style={{ fontSize: 14, color: t.muted }}>대시보드는 준비 중이에요</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: #555; }
        button { font-family: inherit; }
        @keyframes blink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>
    </div>
  )
}

const dark = {
  bg: '#0a0a0a', sidebar: '#0f0f0f', text: '#e8e8e8', muted: '#555',
  border: '#1e1e1e', aiMsg: '#161616', input: '#111', hover: '#1a1a1a', popup: '#161616',
}
const light = {
  bg: '#ffffff', sidebar: '#f9f9f9', text: '#111', muted: '#999',
  border: '#e5e5e5', aiMsg: '#f4f4f4', input: '#f9f9f9', hover: '#f0f0f0', popup: '#ffffff',
}
