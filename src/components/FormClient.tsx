'use client'

import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from '@/context/ThemeContext'
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from 'recharts'

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

interface ChatSession {
  id: string
  title: string | null
  started_at: string
  ended_at: string | null
}

interface UserInfo {
  display_name: string | null
  email: string | null
}

interface EmotionEntry {
  id: string
  raw_emotion: string
  intensity: number
  created_at: string
  summary: string | null
}

type View = 'chat' | 'settings' | 'dashboard'

// ─── Supabase ────────────────────────────────────────────────────────────────

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요.' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // 사이드바 데이터
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo>({ display_name: null, email: null })
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const [dashboardData, setDashboardData] = useState<EmotionEntry[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [emotionColors, setEmotionColors] = useState<Record<string, string>>({})

  const [hoveredPoint, setHoveredPoint] = useState<any>(null)

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

  // 포커스 복구
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus()
    }
  }, [isLoading])

  // 유저 정보 + 세션 목록 초기 로드
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single()

      if (userData) setUserInfo(userData)

      await fetchSessions()
    }
    load()
  }, [])

  useEffect(() => {
    if (view === 'dashboard') fetchDashboardData()
  }, [view])

  // ─── 세션 목록 조회 ─────────────────────────────────────────────────────────

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, started_at, ended_at')
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) setSessions(data)
  }

  const fetchDashboardData = async () => {
    setDashboardLoading(true)

    const [{ data: entries }, { data: emotions }] = await Promise.all([
      supabase
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at, summary')
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('standard_emotions')
        .select('name, color_code'),
    ])

    if (entries) setDashboardData(entries)
    if (emotions) {
      const map: Record<string, string> = {}
      emotions.forEach(e => { map[e.name] = e.color_code })
      setEmotionColors(map)
    }

    setDashboardLoading(false)
  }

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
          sessionId,
        }),
      })
      const data = await res.json()
      setIsLoading(false)

      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'ai', content: '이번 달 무료 대화 횟수(5회)를 모두 사용했어요. 다음 달에 다시 만나요.' }])
        setSessionEnded(true)
        return
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.reply ?? '답장을 가져오지 못했어요.' }])
    } catch {
      setIsLoading(false)
      setMessages(prev => [...prev, { role: 'ai', content: '오류가 발생했어요. 다시 시도해주세요.' }])
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
          sessionId,
        }),
      })
      const data = await res.json()
      setExtractedData(data)
      await fetchSessions() // 종료 후 목록 갱신 (ended_at 반영)
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

  // ─── 새 대화 ────────────────────────────────────────────────────────────────

  const handleNewChat = () => {
    setMessages([{ role: 'ai', content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요.' }])
    setInput('')
    setSessionEnded(false)
    setExtractedData(null)
    setIsExtracting(false)
    setView('chat')
    setSessionId(null)
    setActiveSessionId(null)
  }

  // ─── 과거 세션 불러오기 ──────────────────────────────────────────────────────

  const handleLoadSession = async (session: ChatSession) => {
    if (activeSessionId === session.id) return

    const { data } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('chat_session_id', session.id)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) return

    const loaded: Message[] = data.map(m => ({
      role: m.role === 'assistant' ? 'ai' : 'user',
      content: m.content,
    }))

    setMessages(loaded)
    setSessionId(session.id)
    setActiveSessionId(session.id)
    setSessionEnded(!!session.ended_at)
    setExtractedData(null)
    setIsExtracting(false)
    setView('chat')
  }

  // ─── 로그아웃 ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
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

  // 유저 이름 이니셜
  const initial = (userInfo.display_name ?? '?')[0]

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
            {sessions.length === 0 ? (
              <p style={{ fontSize: 12, color: t.muted, padding: '8px 12px' }}>
                아직 대화 기록이 없어요
              </p>
            ) : (
              sessions.map((s) => {
                const label = s.title ?? new Date(s.started_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                const isActive = activeSessionId === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => handleLoadSession(s)}
                    style={{
                      padding: '9px 12px', borderRadius: 8,
                      cursor: 'pointer', marginBottom: 2,
                      background: isActive ? t.hover : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      fontSize: 13, color: t.text, fontWeight: 500,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>
                      {s.ended_at ? '완료' : '진행 중'}
                    </div>
                  </div>
                )
              })
            )}
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
                <button onClick={handleLogout} style={{
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
              }}>{initial}</div>
              <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontSize: 13, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userInfo.display_name ?? '사용자'}
                </div>
                <div style={{ fontSize: 11, color: t.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userInfo.email ?? ''}
                </div>
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
          }}>{initial}</button>
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
                        <span style={{ fontSize: 20, fontWeight: 600, color: t.text }}>{extractedData.emotion}</span>
                        <span style={{ fontSize: 12, color: t.muted }}>강도</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#a78bfa' }}>{extractedData.intensity}</span>
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
                  }}>
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
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>화면 테마</div>
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
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{userInfo.display_name ?? '사용자'}</div>
                    <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{userInfo.email ?? ''}</div>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#fff', fontWeight: 600,
                  }}>{initial}</div>
                </div>
                <div style={{ height: 1, background: t.border }} />
                <button onClick={handleLogout} style={{
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

        {/* ── 대시보드 뷰 ── */}
        {view === 'dashboard' && (
          <div style={{ flex: 1, overflowY: 'auto', background: t.bg }}>
            <div style={{ padding: '28px 32px' }}>
              {dashboardLoading ? (
                <p style={{ color: t.muted, fontSize: 14 }}>불러오는 중...</p>
              ) : dashboardData.length === 0 ? (
                <div style={{
                  height: '80vh', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16,
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a78bfa22, #60a5fa22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {Icons.chart(t.muted)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, color: t.text, fontWeight: 600, marginBottom: 8 }}>아직 감정 기록이 없어요</p>
                    <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>대화를 마치면 감정이 여기 쌓여요.<br />데이터가 쌓일수록 패턴이 보이기 시작해요.</p>
                  </div>
                  <button onClick={() => { setView('chat'); handleNewChat() }} style={{
                    marginTop: 8, padding: '12px 28px', borderRadius: 24,
                    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    첫 대화 시작하기
                  </button>
                </div>
              ) : (() => {
                const total = dashboardData.length
                const freq: Record<string, number> = {}
                dashboardData.forEach(e => { freq[e.raw_emotion] = (freq[e.raw_emotion] ?? 0) + 1 })
                const top3 = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
                const topEmotion = top3[0]
                const avgIntensity = (dashboardData.reduce((s, e) => s + e.intensity, 0) / total).toFixed(1)
                const barData = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))

                // 이번주 vs 지난주
                const now = new Date()
                const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - now.getDay())
                const startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
                const thisWeekData = dashboardData.filter(e => new Date(e.created_at) >= startOfThisWeek)
                const lastWeekData = dashboardData.filter(e => new Date(e.created_at) >= startOfLastWeek && new Date(e.created_at) < startOfThisWeek)
                const thisWeekAvg = thisWeekData.length ? (thisWeekData.reduce((s, e) => s + e.intensity, 0) / thisWeekData.length) : null
                const lastWeekAvg = lastWeekData.length ? (lastWeekData.reduce((s, e) => s + e.intensity, 0) / lastWeekData.length) : null
                const weekDiff = thisWeekAvg !== null && lastWeekAvg !== null ? (thisWeekAvg - lastWeekAvg) : null

                // 타임라인 데이터 — Y축: 감정 종류, X축: 날짜 인덱스, 크기: 강도
                const emotionList = [...new Set(dashboardData.map(e => e.raw_emotion))]
                const timelineData = dashboardData.map((e, i) => ({
                  x: i,
                  y: emotionList.indexOf(e.raw_emotion),
                  z: e.intensity * 15 + 30,
                  emotion: e.raw_emotion,
                  intensity: e.intensity,
                  date: new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                  color: emotionColors[e.raw_emotion] ?? '#a78bfa',
                }))

                // 인사이트 문장
                const insightText = (() => {
                  const highIntensity = dashboardData.filter(e => e.intensity >= 4).length
                  if (weekDiff !== null && weekDiff > 0.5) return `이번 주 감정 강도가 지난 주보다 높아졌어요. ${topEmotion[0]}이 많이 느껴지고 있네요.`
                  if (weekDiff !== null && weekDiff < -0.5) return `이번 주는 지난 주보다 조금 가라앉은 것 같아요. ${topEmotion[0]}이 주를 이루고 있어요.`
                  if (highIntensity > total * 0.6) return `요즘 감정 강도가 높은 편이에요. ${topEmotion[0]}을(를) 가장 자주 느끼고 있어요.`
                  return `${total}번의 기록 중 ${topEmotion[0]}을(를) 가장 많이 느꼈어요.`
                })()

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

                    {/* ① 인사이트 + CTA */}
                    <div style={{
                      gridColumn: '1 / 4',
                      background: 'linear-gradient(135deg, #7c3aed22, #3b82f622)',
                      border: `1px solid #a78bfa33`,
                      borderRadius: 20, padding: '24px 28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    }}>
                      <div>
                        <p style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '0.08em', marginBottom: 8 }}>이번 달 요약</p>
                        <p style={{ fontSize: 17, color: t.text, fontWeight: 600, lineHeight: 1.5 }}>{insightText}</p>
                      </div>
                      <button onClick={() => { setView('chat'); handleNewChat() }} style={{
                        flexShrink: 0, padding: '11px 22px', borderRadius: 20,
                        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                        border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                      }}>
                        오늘 털어놓기
                      </button>
                    </div>

                    {/* ② 총 기록 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 11, color: t.muted, marginBottom: 12 }}>총 기록</p>
                      <p style={{ fontSize: 36, fontWeight: 700, color: t.text, lineHeight: 1 }}>
                        {total}<span style={{ fontSize: 14, color: t.muted, marginLeft: 4 }}>회</span>
                      </p>
                    </div>

                    {/* ③ 평균 강도 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 11, color: t.muted, marginBottom: 12 }}>평균 강도</p>
                      <p style={{ fontSize: 36, fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}>
                        {avgIntensity}<span style={{ fontSize: 14, color: t.muted, marginLeft: 4 }}>/5</span>
                      </p>
                    </div>

                    {/* ④ 자주 느낀 감정 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 11, color: t.muted, marginBottom: 12 }}>자주 느낀 감정</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {top3.map(([emotion, count], i) => (
                          <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: emotionColors[emotion] ?? '#a78bfa',
                              opacity: 1 - i * 0.25,
                            }} />
                            <span style={{ fontSize: 14, color: t.text, fontWeight: i === 0 ? 600 : 400 }}>{emotion}</span>
                            <span style={{ fontSize: 12, color: t.muted, marginLeft: 'auto' }}>{count}회</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ⑤ 이번주 vs 지난주 */}
                    {weekDiff !== null && (
                      <div style={{
                        gridColumn: '1 / 4',
                        background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px',
                        display: 'flex', alignItems: 'center', gap: 40,
                      }}>
                        <div>
                          <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>이번 주 평균 강도</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: t.text }}>
                            {thisWeekAvg!.toFixed(1)}<span style={{ fontSize: 13, color: t.muted, marginLeft: 4 }}>/5</span>
                          </p>
                        </div>
                        <div style={{ fontSize: 20, color: t.muted }}>vs</div>
                        <div>
                          <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>지난 주 평균 강도</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: t.text }}>
                            {lastWeekAvg!.toFixed(1)}<span style={{ fontSize: 13, color: t.muted, marginLeft: 4 }}>/5</span>
                          </p>
                        </div>
                        <div style={{
                          marginLeft: 'auto', padding: '8px 16px', borderRadius: 20,
                          background: weekDiff > 0 ? '#f8717122' : '#6ee7b722',
                          color: weekDiff > 0 ? '#f87171' : '#6ee7b7',
                          fontSize: 13, fontWeight: 600,
                        }}>
                          {weekDiff > 0 ? `▲ ${weekDiff.toFixed(1)} 상승` : `▼ ${Math.abs(weekDiff).toFixed(1)} 하락`}
                        </div>
                      </div>
                    )}

                    {/* ⑥ 감정 타임라인 */}
                    <div style={{ gridColumn: '1 / 3', background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 13, color: t.text, fontWeight: 500, marginBottom: 4 }}>감정 타임라인</p>
                      <p style={{ fontSize: 11, color: t.muted, marginBottom: 16 }}>점 크기 = 감정 강도</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                          <XAxis
                            dataKey="x"
                            type="number"
                            domain={[-0.5, dashboardData.length - 0.5]}
                            tick={false} axisLine={false} tickLine={false}
                          />
                          <YAxis
                            dataKey="y"
                            type="number"
                            domain={[-0.5, emotionList.length - 0.5]}
                            ticks={emotionList.map((_, i) => i)}
                            tickFormatter={(v) => emotionList[v] ?? ''}
                            tick={{ fontSize: 11, fill: t.muted }}
                            axisLine={false} tickLine={false} width={36}
                          />
                          <ZAxis dataKey="z" range={[40, 160]} />
                          {hoveredPoint && (
                            <foreignObject x={hoveredPoint.cx + 10} y={hoveredPoint.cy - 20} width={140} height={50}>
                              <div style={{
                                background: t.popup, border: `1px solid ${t.border}`,
                                borderRadius: 8, padding: '6px 10px', fontSize: 12, color: t.text,
                                whiteSpace: 'nowrap',
                              }}>
                                <div style={{ fontWeight: 600 }}>{hoveredPoint.emotion} · 강도 {hoveredPoint.intensity}</div>
                                <div style={{ color: t.muted }}>{hoveredPoint.date}</div>
                              </div>
                            </foreignObject>
                          )}
                          <Scatter
                            data={timelineData}
                            shape={(props: any) => {
                              const { cx, cy, payload } = props
                              return (
                                <circle
                                  cx={cx} cy={cy}
                                  r={Math.sqrt(payload.z) * 1.0}
                                  fill={payload.color} fillOpacity={0.8}
                                  style={{ cursor: 'pointer' }}
                                  onMouseEnter={() => setHoveredPoint({ ...payload, cx, cy })}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                              )
                            }}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ⑦ 감정 빈도 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 13, color: t.text, fontWeight: 500, marginBottom: 16 }}>감정 빈도</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={barData} barSize={20} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 10, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: t.muted }} axisLine={false} tickLine={false} width={36} />
                          <Tooltip
                            contentStyle={{ background: t.popup, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12 }}
                            formatter={(value) => [`${value}회`]}
                          />
                          <Bar
                            dataKey="count"
                            shape={(props: any) => {
                              const { x, y, width, height, payload } = props
                              return <rect x={x} y={y} width={width} height={height} fill={emotionColors[payload.name] ?? '#a78bfa'} rx={4} ry={4} />
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ⑧ 최근 기록 */}
                    <div style={{ gridColumn: '1 / 4', background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, overflow: 'hidden' }}>
                      <p style={{ fontSize: 13, color: t.text, fontWeight: 500, padding: '20px 24px 12px' }}>최근 기록</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                        {[...dashboardData].reverse().slice(0, 6).map((e, i) => (
                          <div key={e.id} style={{
                            padding: '14px 24px',
                            borderTop: `1px solid ${t.border}`,
                            borderRight: i % 2 === 0 ? `1px solid ${t.border}` : 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: emotionColors[e.raw_emotion] ?? '#a78bfa', flexShrink: 0 }} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{e.raw_emotion}</span>
                              <span style={{ fontSize: 11, color: '#a78bfa' }}>강도 {e.intensity}</span>
                              <span style={{ fontSize: 11, color: t.muted, marginLeft: 'auto' }}>
                                {new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                            {e.summary && <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.6, marginLeft: 16 }}>{e.summary}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )
              })()}
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
