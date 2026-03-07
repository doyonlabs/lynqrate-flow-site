'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

// ─── 타입 ───────────────────────────────────────────────────────────────────

type Role = 'ai' | 'user'

interface Message {
  role: Role
  content: string
}

interface ExtractedData {
  emotion: string
  intensity: number
  trigger: string
  summary: string
}

type View = 'chat' | 'settings' | 'dashboard'

// ─── 목업 히스토리 (DB 연결 전 임시) ────────────────────────────────────────

const HISTORY = [
  { date: '3월 5일', emotion: '불안', intensity: 4 },
  { date: '3월 4일', emotion: '무기력', intensity: 3 },
  { date: '3월 2일', emotion: '설렘', intensity: 4 },
  { date: '2월 28일', emotion: '외로움', intensity: 2 },
]

// ─── 아이콘 ──────────────────────────────────────────────────────────────────

const Icons = {
  menu: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  plus: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  chart: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="7" width="4" height="14" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  ),
  settings: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (color: string) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  back: (color: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  send: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  stop: (color: string) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function FormClient() {
  const { isDark, toggleTheme } = useTheme()
  const t = isDark ? dark : light

  const [view, setView] = useState<View>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const settingsRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasUserMessage = messages.some(m => m.role === 'user')

  // 클릭 외부 감지 (설정 팝업)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isExtracting, extractedData])

  // textarea 자동 높이
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // ─── 메시지 전송 ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || sessionEnded) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content,
          })),
          sessionId,  // ← 추가
        }),
      })
      const data = await res.json()
        setMessages(prev => [...prev, { role: 'ai', content: data.reply ?? '답장을 가져오지 못했어요.' }])
      if (data.sessionId) setSessionId(data.sessionId)  // ← 추가
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '오류가 발생했어요. 다시 시도해주세요.' }])
    } finally {
      setIsLoading(false)
    }
  }

  // ─── 대화 종료 ──────────────────────────────────────────────────────────────

  const handleEndSession = async () => {
    if (!hasUserMessage || isLoading || sessionEnded) return

    setSessionEnded(true)
    setIsExtracting(true)

    try {
      const res = await fetch('/api/chat/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content,
          })),
          sessionId,  // ← 추가
        }),
      })
      const data = await res.json()
      setExtractedData(data)
      // TODO: DB 저장 (emotion_entries) — DB 연결 후 활성화
    } catch {
      setExtractedData({
        emotion: '알 수 없음',
        intensity: 0,
        trigger: '추출 실패',
        summary: '감정 데이터를 추출하지 못했어요.',
      })
    } finally {
      setIsExtracting(false)
    }
  }

  // ─── 새 대화 ─────────────────────────────────────────────────────────────

  const handleNewChat = () => {
    setMessages([{ role: 'ai', content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요.' }])
    setInput('')
    setSessionEnded(false)
    setExtractedData(null)
    setIsExtracting(false)
    setView('chat')
    setSessionId(null)
  }

  // ─── 서브 컴포넌트 ────────────────────────────────────────────────────────

  const AIAvatar = () => (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: '#fff',
    }}>✦</div>
  )

  const IntensityBar = ({ value }: { value: number }) => (
    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{
          width: 20, height: 5, borderRadius: 3,
          background: n <= value
            ? `hsl(${260 - n * 16}, 80%, ${isDark ? '65%' : '55%'})`
            : t.border,
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )

  const SidebarItem = ({ icon, label, active, onClick }: {
    icon: React.ReactNode; label: string; active: boolean; onClick: () => void
  }) => (
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

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: t.bg, color: t.text,
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s, color 0.3s',
    }}>

      {/* ── 사이드바 (열림) ── */}
      {sidebarOpen && (
        <div style={{
          width: 260, flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column',
          background: t.sidebar, transition: 'background 0.3s',
        }}>
          {/* 로고 + 새 대화 */}
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
            <button onClick={handleNewChat} style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.text, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {Icons.plus(t.text)} 새 대화
            </button>
          </div>

          {/* 대시보드 버튼 */}
          <div style={{ padding: '0 8px 8px' }}>
            <SidebarItem
              icon={Icons.chart(view === 'dashboard' ? t.text : t.muted)}
              label="대시보드"
              active={view === 'dashboard'}
              onClick={() => setView('dashboard')}
            />
            <div style={{ height: 1, background: t.border, margin: '8px 4px' }} />
          </div>

          {/* 최근 기록 */}
          <div style={{ padding: '0 8px', flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: 11, color: t.muted, padding: '0 8px', marginBottom: 6, letterSpacing: '0.06em' }}>
              최근 기록
            </p>
            {/* TODO: DB 연결 후 실제 데이터로 교체 */}
            {HISTORY.map((h, i) => (
              <div key={i} style={{
                padding: '9px 12px', borderRadius: 8,
                cursor: 'pointer', marginBottom: 2,
              }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{h.emotion}</div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{h.date} · 강도 {h.intensity}</div>
              </div>
            ))}
          </div>

          {/* 하단 유저/설정 */}
          <div style={{ padding: '8px', position: 'relative' }} ref={settingsRef}>
            {settingsOpen && (
              <div style={{
                position: 'absolute', bottom: 60, left: 8, right: 8,
                background: t.popup, border: `1px solid ${t.border}`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 100,
              }}>
                <button onClick={() => { setSettingsOpen(false); setView('settings') }} style={{
                  width: '100%', padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: t.text, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
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
            <button onClick={() => setSettingsOpen(!settingsOpen)} style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
              background: settingsOpen ? t.hover : 'transparent',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, color: '#fff', flexShrink: 0, fontWeight: 600,
              }}>도</div>
              <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                {/* TODO: Supabase에서 유저 이름/이메일 가져오기 */}
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>도영</div>
                <div style={{ fontSize: 11, color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>user@gmail.com</div>
              </div>
              <span style={{ color: t.muted, fontSize: 12 }}>···</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 사이드바 (닫힘) ── */}
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
          <button onClick={handleNewChat} title="새 대화" style={{
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

      {/* ── 메인 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{
          height: 52, borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          background: t.bg, flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>{Icons.menu(t.muted)}</button>

          <span style={{ fontSize: 14, color: t.muted, flex: 1 }}>
            {view === 'settings' ? '설정'
              : view === 'dashboard' ? '대시보드'
              : sessionEnded ? '대화 종료'
              : isLoading ? '답변 생성 중...'
              : '감정 대화'}
          </span>

          {/* 대화 종료 버튼 — 채팅 뷰 + 유저 메시지 있을 때만 */}
          {view === 'chat' && hasUserMessage && !sessionEnded && (
            <button onClick={handleEndSession} disabled={isLoading} style={{
              padding: '6px 14px', borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${isLoading ? t.border : '#f87171'}`,
              color: isLoading ? t.muted : '#f87171',
              fontSize: 12, cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'opacity 0.2s',
            }}>
              {Icons.stop(isLoading ? t.muted : '#f87171')} 대화 종료
            </button>
          )}

          {view !== 'chat' && (
            <button onClick={() => setView('chat')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            }}>{Icons.back(t.muted)}</button>
          )}
        </div>

        {/* ── 채팅 뷰 ── */}
        {view === 'chat' && (
          <>
            {/* 메시지 스크롤 영역 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0', background: t.bg }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    {msg.role === 'ai' ? (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <AIAvatar />
                        <div style={{
                          background: t.aiMsg,
                          borderRadius: '4px 16px 16px 16px',
                          padding: '12px 16px',
                          fontSize: 14, lineHeight: 1.7, color: t.text,
                          maxWidth: '80%', whiteSpace: 'pre-wrap',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{
                          background: '#7c3aed',
                          borderRadius: '16px 4px 16px 16px',
                          padding: '12px 16px',
                          fontSize: 14, lineHeight: 1.7, color: '#fff',
                          maxWidth: '80%', whiteSpace: 'pre-wrap',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* AI 타이핑 인디케이터 */}
                {isLoading && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <AIAvatar />
                    <div style={{
                      background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                      padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center',
                    }}>
                      {[0, 0.3, 0.6].map((delay, i) => (
                        <span key={i} style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: t.muted, display: 'inline-block',
                          animation: `pulse 1.2s ${delay}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 감정 추출 중 */}
                {isExtracting && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <AIAvatar />
                    <div style={{
                      background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                      padding: '12px 16px', fontSize: 13, color: t.muted,
                    }}>
                      오늘 대화를 정리하고 있어요...
                    </div>
                  </div>
                )}

                {/* 추출 결과 카드 */}
                {extractedData && !isExtracting && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <AIAvatar />
                    <div style={{
                      background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                      padding: '16px 20px', maxWidth: '80%',
                    }}>
                      <p style={{ fontSize: 13, color: t.muted, marginBottom: 12, letterSpacing: '0.04em' }}>
                        오늘의 감정 기록
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 20, fontWeight: 600, color: t.text }}>
                          {extractedData.emotion}
                        </span>
                        <span style={{ fontSize: 12, color: t.muted }}>강도</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#a78bfa' }}>
                          {extractedData.intensity}
                        </span>
                      </div>

                      <IntensityBar value={extractedData.intensity} />

                      {extractedData.trigger && (
                        <p style={{ fontSize: 13, color: t.muted, marginTop: 12, lineHeight: 1.6 }}>
                          {extractedData.trigger}
                        </p>
                      )}

                      {extractedData.summary && (
                        <p style={{ fontSize: 14, color: t.text, marginTop: 10, lineHeight: 1.7 }}>
                          {extractedData.summary}
                        </p>
                      )}

                      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={handleNewChat} style={{
                          padding: '8px 16px', borderRadius: 20,
                          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                          border: 'none', color: '#fff', fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {Icons.plus('#fff')} 새 대화 시작
                        </button>
                        <button onClick={() => setView('dashboard')} style={{
                          padding: '8px 16px', borderRadius: 20,
                          background: 'transparent', border: `1px solid ${t.border}`,
                          color: t.muted, fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {Icons.chart(t.muted)} 대시보드 보기
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {/* 입력창 */}
            {!sessionEnded && (
              <div style={{
                padding: '12px 24px 16px',
                background: t.bg,
                borderTop: `1px solid ${t.border}`,
                flexShrink: 0,
              }}>
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-end',
                    background: t.input,
                    border: `1px solid ${t.border}`,
                    borderRadius: 14, padding: '10px 12px',
                    transition: 'border-color 0.2s',
                  }}
                    onFocus={() => {}}
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="지금 어떤 마음인지 말해보세요..."
                      rows={1}
                      disabled={isLoading}
                      style={{
                        flex: 1, background: 'transparent', border: 'none',
                        color: t.text, fontSize: 14, lineHeight: 1.6,
                        resize: 'none', outline: 'none',
                        fontFamily: 'inherit', overflowY: 'hidden',
                        minHeight: 24,
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: input.trim() && !isLoading
                          ? 'linear-gradient(135deg, #a78bfa, #60a5fa)'
                          : t.border,
                        border: 'none',
                        cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}
                    >
                      {Icons.send(input.trim() && !isLoading ? '#fff' : t.muted)}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: 8 }}>
                    Enter로 전송 · Shift+Enter 줄바꿈 · 대화가 끝나면 "대화 종료"를 눌러주세요
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 설정 뷰 ── */}
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
                    border: 'none', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.3s', flexShrink: 0,
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
                    {/* TODO: Supabase에서 유저 정보 가져오기 */}
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
                {/* TODO: 로그아웃 기능 구현 */}
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

        {/* ── 대시보드 뷰 (준비 중) ── */}
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
        textarea::placeholder { color: #555; }
        button { font-family: inherit; }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── 테마 ────────────────────────────────────────────────────────────────────

const dark = {
  bg: '#0a0a0a', sidebar: '#0f0f0f', text: '#e8e8e8', muted: '#555',
  border: '#1e1e1e', aiMsg: '#161616', input: '#111', hover: '#1a1a1a', popup: '#161616',
}
const light = {
  bg: '#ffffff', sidebar: '#f9f9f9', text: '#111', muted: '#999',
  border: '#e5e5e5', aiMsg: '#f4f4f4', input: '#f9f9f9', hover: '#f0f0f0', popup: '#ffffff',
}
