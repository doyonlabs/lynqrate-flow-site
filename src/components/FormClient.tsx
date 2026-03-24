'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from '@/context/ThemeContext'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

// ─── 타입 ───────────────────────────────────────────────────────────────────

type Role = 'ai' | 'user'

interface Message {
  role: Role
  content: string
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
  trigger_text?: string
}

type View = 'chat' | 'settings' | 'dashboard' | 'records'

// ─── Supabase ────────────────────────────────────────────────────────────────

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── 아이콘 ──────────────────────────────────────────────────────────────────

const Icons = {
  menu: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9" />
      <rect x="10" y="7" width="4" height="14" />
      <rect x="17" y="3" width="4" height="18" />
    </svg>
  ),
  settings: (color: string) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

  // [FIX] 모바일 감지 — SSR safe (false로 시작, mount 후 실제값)
  const [isMobile, setIsMobile] = useState(false)

  const [view, setView] = useState<View>('dashboard')
  // [FIX] 사이드바 초기값도 false로 시작, mount 후 뷰포트에 따라 세팅
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 채팅 상태
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요. 대화가 쌓이면 내 감정 패턴을 볼 수 있어요.' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // 사이드바 데이터
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo>({ display_name: null, email: null })
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // [FIX] dashboardLoading 초기값 true → 첫 렌더 empty state 플래시 방지
  const [dashboardData, setDashboardData] = useState<EmotionEntry[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [emotionColors, setEmotionColors] = useState<Record<string, string>>({})

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<Record<string, string>>({})

  const [calModalOpen, setCalModalOpen] = useState(false)

  const [todayEntries, setTodayEntries] = useState<EmotionEntry[]>([])

  const [lastEntry, setLastEntry] = useState<EmotionEntry | null>(null)

  const [hasNewMessage, setHasNewMessage] = useState(false)

  const [hoveredPoint, setHoveredPoint] = useState<any>(null)

  const settingsRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollInstant = useRef(false)

  const hasUserMessage = messages.some(m => m.role === 'user')

  // [FIX] mount 후 뷰포트 감지 → SSR hydration 불일치 없음
  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile) // 데스크탑: 열림 / 모바일: 닫힘
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // 외부 클릭 감지
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: scrollInstant.current ? 'instant' as ScrollBehavior : 'smooth'
    })
    scrollInstant.current = false
  }, [messages, isLoading])

  // textarea 자동 높이
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // 포커스 복구 (데스크탑만)
  useEffect(() => {
    if (!isLoading && !isMobile) textareaRef.current?.focus()
  }, [isLoading, isMobile])

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: userData } = await supabase
        .from('users').select('display_name, email').eq('id', user.id).single()
      if (userData) setUserInfo(userData)
      await fetchSessions()
      await fetchTodayEntries()

      // 미완료 세션 자동 extract
      const { data: incompleteSessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .is('last_extracted_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (incompleteSessions?.length) {
        incompleteSessions.forEach(s => {
          fetch('/api/chat/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: s.id }),
          }).then(() => {
            fetchSessions()
            fetchTodayEntries()
          })
        })
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (view === 'dashboard') fetchDashboardData()
  }, [view])

  //풀 스크롤 방지
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none'
    return () => { document.body.style.overscrollBehavior = '' }
  }, [])

  //탭 전환 / 앱 전환 / 화면 잠금 시 세션 추출
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasNewMessage && sessionId) {
        const snapshot = messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
        const sid = sessionId
        fetch('/api/chat/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        }).then(() => {
          fetchSessions()
          fetchTodayEntries()
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [hasNewMessage, sessionId, messages])
  // ─── 데이터 조회 ──────────────────────────────────────────────────────────

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions').select('id, title, started_at, ended_at')
      .order('created_at', { ascending: false }).limit(30)
    if (data) setSessions(data)
  }

  const fetchTodayEntries = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [{ data: entries }, { data: emotions }, { data: lastData }] = await Promise.all([
      supabase
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('standard_emotions')
        .select('name, color_code'),
      supabase
        .from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
        .lt('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1),
    ])
    if (entries) setTodayEntries(entries)
    if (lastData && lastData.length > 0) setLastEntry(lastData[0])
    if (emotions) {
      const map: Record<string, string> = {}
      emotions.forEach(e => { map[e.name] = e.color_code })
      setEmotionColors(map)
    }
  }

  const fetchDashboardData = async () => {
    setDashboardLoading(true)
    const [{ data: entries }, { data: emotions }] = await Promise.all([
      supabase.from('emotion_entries')
        .select('id, raw_emotion, intensity, created_at, summary, trigger_text')
        .order('created_at', { ascending: true }).limit(50),
      supabase.from('standard_emotions').select('name, color_code'),
    ])
    if (entries) setDashboardData(entries)
    if (emotions) {
      const map: Record<string, string> = {}
      emotions.forEach(e => { map[e.name] = e.color_code })
      setEmotionColors(map)
    }

    // 공휴일 fetch
    try {
      const res = await fetch('https://holidays.hyunbin.page/2026.json')
      const data = await res.json()
      console.log('공휴일 데이터:', data)
      const map: Record<string, string> = {}
      Object.entries(data).forEach(([date, names]) => {
        const [, m, d] = date.split('-')
        map[`${parseInt(m)}-${parseInt(d)}`] = (names as string[])[0]
      })
      setHolidays(map)
    } catch {
      // 실패해도 하드코딩 fallback 유지
    }
    setDashboardLoading(false)
  }

  // ─── 헬퍼 ────────────────────────────────────────────────────────────────

  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  // ─── 메시지 전송 ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
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
          messages: newMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
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
      setHasNewMessage(true)
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
        setActiveSessionId(data.sessionId)
        await fetchSessions()
      }
    } catch {
      setIsLoading(false)
      setMessages(prev => [...prev, { role: 'ai', content: '오류가 발생했어요. 다시 시도해주세요.' }])
    }
  }
  // ─── 새 대화 ────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    // 현재 세션에 유저 메시지 있으면 백그라운드 extract
    //console.log('handleNewChat 진입, sessionId:', sessionId, 'hasUser:', messages.some(m => m.role === 'user'))
    if (hasNewMessage && sessionId) {
      //console.log('handleNewChat sessionId:', sessionId, 'messages:', messages.length)
      const snapshot = messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
      const sid = sessionId
      fetch('/api/chat/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      }).then(() => {
        fetchSessions()
        fetchTodayEntries()
      })
    }

    setMessages([{ role: 'ai', content: '안녕하세요. 오늘 어떠세요? 편하게 털어놔 보세요. 대화가 쌓이면 내 감정 패턴을 볼 수 있어요.' }])
    setInput('')
    setSessionEnded(false)
    setHasNewMessage(false)
    setView('chat')
    setSessionId(null)
    setActiveSessionId(null)
    closeSidebarOnMobile()
  }, [messages, sessionEnded, sessionId, closeSidebarOnMobile])

  // ─── 과거 세션 불러오기 ──────────────────────────────────────────────────

  const handleLoadSession = async (session: ChatSession) => {
    // 현재 세션에 새 메시지 있으면 백그라운드 extract
    if (hasNewMessage && sessionId && sessionId !== session.id) {
      const snapshot = messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))
      const sid = sessionId
      fetch('/api/chat/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      }).then(() => {
        fetchSessions()
        fetchTodayEntries()
      })
    }
    setHasNewMessage(false)

    if (activeSessionId === session.id) { 
      setView('chat')
      scrollInstant.current = true
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 0)
      closeSidebarOnMobile()
      return 
    }
    const { data } = await supabase
      .from('chat_messages').select('role, content')
      .eq('chat_session_id', session.id).order('created_at', { ascending: true })
    if (!data || data.length === 0) return
    scrollInstant.current = true
    setMessages(data.map(m => ({ role: m.role === 'assistant' ? 'ai' : 'user' as Role, content: m.content })))
    setSessionId(session.id)
    setActiveSessionId(session.id)
    setSessionEnded(!!session.ended_at)
    setHasNewMessage(false)
    setView('chat')
    scrollInstant.current = true
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 0)
    closeSidebarOnMobile()
  }

  // ─── 로그아웃 ────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ─── 탈퇴하기 ────────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!confirm('정말 탈퇴하시겠어요? 모든 기록이 삭제되며 복구할 수 없어요.')) return
    const res = await fetch('/api/user/delete', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      window.location.href = '/'
    } else {
      alert('탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.')
    }
  }

  // ─── 서브 컴포넌트 ───────────────────────────────────────────────────────

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
          background: n <= value ? `hsl(${260 - n * 16}, 80%, ${isDark ? '65%' : '55%'})` : t.border,
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

  const initial = (userInfo.display_name ?? '?')[0]

  // ─── 렌더 ────────────────────────────────────────────────────────────────

  return (
    // [FIX] height: 100dvh → iOS Safari 주소창 포함 실제 뷰포트 높이
    <div style={{
      display: 'flex',
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      overscrollBehavior: 'none',
      background: t.bg, color: t.text,
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s, color 0.3s',
      overflow: 'hidden',
    }}>

      {/* ── 사이드바 (열림) ── */}
      {sidebarOpen && !isMobile && (
        <div onClick={e => e.stopPropagation()} style={{
          width: 260, flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column',
          background: t.sidebar, transition: 'background 0.3s',
          // [FIX] 모바일: fixed overlay
          ...(isMobile ? {
            position: 'fixed' as const,
            top: 0, left: 0, bottom: 0,
            zIndex: 50,
          } : {}),
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
              onClick={() => { setView('dashboard'); setActiveSessionId(null); closeSidebarOnMobile() }}
            />
            <div style={{ height: 1, background: t.border, margin: '8px 4px' }} />
          </div>

          {/* 대화 목록 */}
          <div style={{ padding: '0 8px', flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0 }}>
            <p style={{ fontSize: 11, color: t.muted, padding: '0 8px', marginBottom: 6, letterSpacing: '0.06em' }}>최근 기록</p>
            <div style={{ minHeight: '100%' }}>
              {sessions.length === 0 ? (
                <p style={{ fontSize: 12, color: t.muted, padding: '8px 12px' }}>아직 대화 기록이 없어요</p>
              ) : (
                sessions.map(s => {
                  const label = s.title ?? new Date(s.started_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                  const isActive = activeSessionId === s.id
                  return (
                    <div key={s.id} onClick={() => handleLoadSession(s)} style={{
                      padding: '11px 12px', borderRadius: 8,  // 9px → 11px
                      cursor: 'pointer', marginBottom: 2,
                      background: isActive ? t.hover : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <span style={{ fontSize: 13, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
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
                <button onClick={() => { setSettingsOpen(false); setView('settings'); closeSidebarOnMobile() }} style={{
                  width: '100%', padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: t.text, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                  {Icons.settings(t.muted)} <span>설정</span>
                </button>
                <div style={{ height: 1, background: t.border }} />
                <button onClick={handleLogout} style={{
                  width: '100%', padding: '11px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: '#f87171', fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                  {Icons.logout('#f87171')} <span>로그아웃</span>
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

      {/* ── 사이드바 (닫힘) — 데스크탑에서만 미니바 표시 ── */}
      {!sidebarOpen && !isMobile && (
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
      {/* [FIX] minWidth: 0 → flex child가 제대로 줄어들게 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, }}>

        {/* 헤더 */}
        <div style={{
          minHeight: 52, borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
          background: t.bg, flexShrink: 0,
        }}>
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
            }}>{Icons.menu(isMobile ? t.text : t.muted)}</button>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <span style={{ fontSize: 14, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view === 'settings' ? '설정'
                : view === 'dashboard' ? '대시보드'
                : view === 'records' ? '기록'
                : sessions.find(s => s.id === activeSessionId)?.title ?? '새 대화'}
            </span>
          </div>
          {isMobile && view !== 'dashboard' && (
            <button onClick={handleNewChat} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.text, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
            }}>
              {Icons.plus(t.text)}
              <span>새 대화</span>
            </button>
          )}
        </div>

        {/* ── 채팅 뷰 ── */}
        {view === 'chat' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'none', padding: isMobile ? '24px 0 80px' : '24px 0', background: t.bg, minHeight: 0 }}>
              {/* [FIX] 모바일 패딩 줄임 */}
              <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', minHeight: '100%' }}>

                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    {msg.role === 'ai' ? (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <AIAvatar />
                        {/* [FIX] wordBreak 추가 */}
                        <div style={{
                          background: t.aiMsg, borderRadius: '4px 16px 16px 16px',
                          padding: '12px 16px', fontSize: 14, lineHeight: 1.7, color: t.text,
                          maxWidth: '80%', whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', overflowWrap: 'break-word',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {/* [FIX] wordBreak 추가 */}
                        <div style={{
                          background: '#7c3aed', borderRadius: '16px 4px 16px 16px',
                          padding: '12px 16px', fontSize: 14, lineHeight: 1.7, color: '#fff',
                          maxWidth: '80%', whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', overflowWrap: 'break-word',
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
                    <div style={{ background: t.aiMsg, borderRadius: '4px 16px 16px 16px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 0.3, 0.6].map((delay, i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: t.muted, display: 'inline-block', animation: `pulse 1.2s ${delay}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

              <div style={{
                padding: isMobile ? '10px 12px calc(56px + env(safe-area-inset-bottom, 0px))' : '12px 24px 16px',
                background: t.bg, borderTop: `1px solid ${t.border}`, flexShrink: 0,
              }}>
              {(() => {
                const RatingDots = ({ value, color }: { value: number; color: string }) => (
                  <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block',
                        background: n <= value ? color : t.border }} />
                    ))}
                  </span>
                )
                const hasToday = todayEntries.length > 0

                if (!hasToday && !lastEntry) return null

                // 오늘 감정 그룹핑 (빈도 + 평균강도)
                const grouped = todayEntries.reduce((acc, e) => {
                  if (!acc[e.raw_emotion]) acc[e.raw_emotion] = { count: 0, totalIntensity: 0 }
                  acc[e.raw_emotion].count += 1
                  acc[e.raw_emotion].totalIntensity += e.intensity
                  return acc
                }, {} as Record<string, { count: number; totalIntensity: number }>)

                const groupedList = Object.entries(grouped).map(([emotion, { count, totalIntensity }]) => ({
                  emotion, count, avgIntensity: Math.round(totalIntensity / count),
                }))

                // 마지막 기록 며칠 전인지
                const daysAgo = lastEntry ? Math.floor(
                  (Date.now() - new Date(lastEntry.created_at).getTime()) / (1000 * 60 * 60 * 24)
                ) : 0

                return (
                  <div
                    onClick={() => setView('dashboard')}
                    style={{
                      maxWidth: 680, margin: '0 auto 6px',
                      padding: '8px 14px', borderRadius: 10,
                      background: t.hover, border: `1px solid ${t.border}`,
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 11, color: t.muted, flexShrink: 0 }}>
                      {hasToday ? `오늘 ${todayEntries.length}회 기록` : `${daysAgo === 0 ? '어제' : `${daysAgo}일 전`} 마지막 기록`}
                    </span>
                    <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      {hasToday ? (
                        <>
                          {groupedList.slice(0, 3).map((g, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.text }}>
                              {g.emotion}
                              {g.count > 1 && <span style={{ fontSize: 10, color: t.muted }}>{g.count}회</span>}
                              <RatingDots value={g.avgIntensity} color={emotionColors[g.emotion] ?? '#a78bfa'} />
                            </span>
                          ))}
                          {groupedList.length > 3 && (
                            <span style={{ fontSize: 11, color: t.muted }}>+{groupedList.length - 3}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.text }}>
                          
                          {lastEntry!.raw_emotion}
                          <RatingDots value={lastEntry!.intensity} color={emotionColors[lastEntry!.raw_emotion] ?? '#a78bfa'} />
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: t.muted, flexShrink: 0 }}>대시보드 보기 →</span>
                  </div>
                )
              })()}
                <div style={{ maxWidth: 680, margin: '0 auto' }}>
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-end',
                    background: t.input, border: `1px solid ${t.border}`,
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
                        fontFamily: 'inherit', overflowY: 'hidden', minHeight: 24,
                      }}
                      onKeyDown={e => {
                        // [FIX] 모바일 소프트 키보드 Enter 충돌 방지
                        if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: input.trim() && !isLoading ? 'linear-gradient(135deg, #a78bfa, #60a5fa)' : t.border,
                      border: 'none',
                      cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}>
                      {Icons.send(input.trim() && !isLoading ? '#fff' : t.muted)}
                    </button>
                  </div>
                  {/* [FIX] 모바일에서 힌트 숨김 */}
                  {!isMobile && (
                    <p style={{ fontSize: 11, color: t.muted, textAlign: 'center', marginTop: 8 }}>
                      Enter로 전송 · Shift+Enter 줄바꿈 · 새 대화 시작 시 자동으로 기록돼요
                    </p>
                  )}
                </div>
              </div>
          </>
        )}

        {/* ── 설정 뷰 ── */}
        {view === 'settings' && (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'none', background: t.bg, minHeight: 0 }}>
            <div style={{ maxWidth: 560, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 24px', minHeight: '110vh' }}>
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
                <div style={{ height: 1, background: t.border }} />
                <button onClick={handleDeleteAccount} style={{
                  width: '100%', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: 'none',
                  color: '#f87171', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', opacity: 0.6,
                }}>
                  회원 탈퇴
                </button>
              </div>
              {/* 피드백 섹션 */}
              <p style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 12, marginTop: 32 }}>피드백</p>
              <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 32 }}>
                <a
                  href="https://tally.so/r/aQG2jX"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: t.text, fontSize: 14, textDecoration: 'none',
                  }}
                >
                  <span>사용 후기 남기기</span>
                  <span style={{ color: t.muted, fontSize: 12 }}>→</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── 기록 뷰 ── */}
        {view === 'records' && (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'none', background: t.bg, minHeight: 0 }}>
            <div style={{ padding: '16px 12px 80px', minHeight: 'calc(100% + 1px)' }}>
              <p style={{ fontSize: 11, color: t.muted, padding: '0 8px', marginBottom: 12, letterSpacing: '0.06em' }}>최근 기록</p>
              {sessions.length === 0 ? (
                <p style={{ fontSize: 13, color: t.muted, padding: '8px 12px' }}>아직 대화 기록이 없어요</p>
              ) : (
                sessions.map(s => {
                  const label = s.title ?? new Date(s.started_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                  const isActive = activeSessionId === s.id
                  return (
                    <div key={s.id} onClick={() => handleLoadSession(s)} style={{
                      padding: '12px 16px', borderRadius: 12, marginBottom: 8,
                      background: isActive ? t.hover : t.sidebar,
                      border: `1px solid ${t.border}`,
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <span style={{ fontSize: 14, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── 대시보드 뷰 ── */}
        {view === 'dashboard' && (
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'none', background: t.bg }}>
            {/* [FIX] 모바일 패딩 줄임 */}
            <div style={{ padding: isMobile ? '16px 12px 80px' : '28px 32px 40px', minHeight: '100%', background: t.bg }}>
              {dashboardLoading ? (
                <p style={{ color: t.muted, fontSize: 14 }}>불러오는 중...</p>
              ) : dashboardData.length === 0 ? (
                <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa22, #60a5fa22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.chart(t.muted)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, color: t.text, fontWeight: 600, marginBottom: 8 }}>오늘 어떤 하루였나요?</p>
                    <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>
                      첫 대화를 나누면 감정이 자동으로 기록돼요.<br />
                      일주일만 써보면 내 패턴이 보이기 시작해요.
                    </p>
                  </div>
                  <button onClick={() => { setView('chat'); handleNewChat() }} style={{
                    marginTop: 8, padding: '12px 28px', borderRadius: 24,
                    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                    border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    지금 시작하기
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

                const now = new Date()
                const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - now.getDay())
                const startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
                const thisWeekData = dashboardData.filter(e => new Date(e.created_at) >= startOfThisWeek)
                const lastWeekData = dashboardData.filter(e => new Date(e.created_at) >= startOfLastWeek && new Date(e.created_at) < startOfThisWeek)

                // 가장 많이 느낀 감정
                const getTopEmotion = (data: typeof dashboardData) => {
                  if (!data.length) return null
                  const count: Record<string, number> = {}
                  data.forEach(e => { count[e.raw_emotion] = (count[e.raw_emotion] || 0) + 1 })
                  return Object.entries(count).sort((a, b) => b[1] - a[1])[0]
                }
                const thisWeekTop = getTopEmotion(thisWeekData)
                const lastWeekTop = getTopEmotion(lastWeekData)
                
                const emotionList = [...new Set(dashboardData.map(e => e.raw_emotion))]
                const timelineData = dashboardData.map((e, i) => ({
                  x: i, y: emotionList.indexOf(e.raw_emotion),
                  z: Math.pow(e.intensity, 2) * 8 + 20,
                  emotion: e.raw_emotion, intensity: e.intensity,
                  date: new Date(e.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                  color: emotionColors[e.raw_emotion] ?? '#a78bfa',
                }))

                const NEGATIVE_EMOTIONS = ['불안', '무기력', '분노', '슬픔', '외로움', '두려움']
                const POSITIVE_EMOTIONS = ['설렘', '기쁨', '감사', '평온']

                const insightText = (() => {
                  const topEmotionName = topEmotion[0]
                  const topEmotionCount = topEmotion[1]
                  const isNegative = NEGATIVE_EMOTIONS.includes(topEmotionName)
                  const isPositive = POSITIVE_EMOTIONS.includes(topEmotionName)

                  if (thisWeekTop && lastWeekTop && thisWeekTop[0] !== lastWeekTop[0]) {
                    const prevIsNeg = NEGATIVE_EMOTIONS.includes(lastWeekTop[0])
                    const currIsPos = POSITIVE_EMOTIONS.includes(thisWeekTop[0])
                    const currIsNeg = NEGATIVE_EMOTIONS.includes(thisWeekTop[0])
                    if (prevIsNeg && currIsPos)
                      return `지난 주 ${lastWeekTop[0]}을 비워냈더니 이번 주엔 ${thisWeekTop[0]}이 찾아왔네요.`
                    if (prevIsNeg && currIsNeg)
                      return `지난 주 ${lastWeekTop[0]}에 이어 이번 주는 ${thisWeekTop[0]}이 많네요. 꺼낼수록 가벼워져요.`
                    return `지난 주 ${lastWeekTop[0]}에서 이번 주 ${thisWeekTop[0]}으로 흘러가고 있어요.`
                  }

                  if (thisWeekTop && thisWeekData.length > lastWeekData.length) {
                    const isNeg = NEGATIVE_EMOTIONS.includes(thisWeekTop[0])
                    if (isNeg)
                      return `이번 주 ${thisWeekTop[0]}이 자주 찾아왔어요. 꺼낼수록 조금씩 비워져요.`
                    return `이번 주 ${thisWeekTop[0]}이 가득한 한 주네요.`
                  }

                  if (isNegative) {
                    if (topEmotionCount >= 5)
                      return `${topEmotionName}을 ${topEmotionCount}번 꺼내놓았어요. 비울수록 가벼워져요.`
                    return `${topEmotionName}이 자주 찾아온 시간이었어요. 꺼낼수록 조금씩 비워져요.`
                  }

                  if (isPositive) {
                    if (topEmotionName === '평온')
                      return `${topEmotionCount}번의 기록 중 평온이 가장 많았어요. 잔잔한 시간이 이어지고 있어요.`
                    return `${topEmotionCount}번의 기록 중 ${topEmotionName}이 가장 많았어요. 좋은 감정이 차곡차곡 쌓이고 있어요.`
                  }

                  return `${total}번의 감정을 기록했어요. 감정을 꺼내는 것만으로도 충분해요.`
                })()

                // [FIX] 모바일: 1열 / 데스크탑: 3열 — 인라인 스타일로 확실하게
                const cols = isMobile ? '1fr' : '1fr 1fr 1fr'
                const gap = isMobile ? 12 : 16
                const fullSpan = isMobile ? undefined : '1 / 4'
                const halfSpan = isMobile ? undefined : '1 / 3'

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: cols, gap }}>

                    {/* ① 인사이트 */}
                    <div style={{
                      gridColumn: fullSpan,
                      background: 'linear-gradient(135deg, #7c3aed22, #3b82f622)',
                      border: '1px solid #a78bfa33', borderRadius: 20,
                      padding: isMobile ? '20px' : '24px 28px',
                      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      justifyContent: 'space-between', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: '#a78bfa', letterSpacing: '0.08em', marginBottom: 8 }}>이번 달 요약</p>
                        <p style={{ fontSize: isMobile ? 14 : 17, color: t.text, fontWeight: 600, lineHeight: 1.5, wordBreak: 'keep-all' }}>{insightText}</p>
                      </div>
                      <button onClick={() => { setView('chat'); handleNewChat() }} style={{
                        flexShrink: 0, padding: '11px 22px', borderRadius: 20,
                        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                        border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        alignSelf: isMobile ? 'flex-start' : 'center',
                      }}>
                        오늘 털어놓기
                      </button>
                    </div>

                    {/* ⑥ 감정 히트맵 */}
                    {(() => {
                      const year = calMonth.getFullYear()
                      const month = calMonth.getMonth()

                      let displayDays: Date[]
                      let headerLabel: string
                      let onPrev: () => void
                      let onNext: () => void

                      if (isMobile) {
                        const getWeekStart = (date: Date) => {
                          const d = new Date(date)
                          const day = d.getDay() // 0=일, 1=월 ... 6=토
                          d.setDate(d.getDate() - day) // 일요일로 이동
                          return d
                        }
                        const weekStart = getWeekStart(calMonth)
                        displayDays = Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(weekStart)
                          d.setDate(weekStart.getDate() + i)
                          return d
                        })
                        const last = displayDays[6]
                        headerLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${last.getMonth() + 1}/${last.getDate()}`
                        onPrev = () => { const d = new Date(calMonth); d.setDate(d.getDate() - 7); setCalMonth(d) }
                        onNext = () => { const d = new Date(calMonth); d.setDate(d.getDate() + 7); setCalMonth(d) }
                      } else {
                        const daysInMonth = new Date(year, month + 1, 0).getDate()
                        displayDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
                        headerLabel = `${year}년 ${month + 1}월`
                        onPrev = () => setCalMonth(new Date(year, month - 1))
                        onNext = () => setCalMonth(new Date(year, month + 1))
                      }

                      const emotionList = [...new Set(dashboardData.map(e => e.raw_emotion))]

                      const heatData: Record<string, { count: number; totalIntensity: number }> = {}
                      dashboardData.forEach(e => {
                        const d = new Date(e.created_at)
                        const dateKey = `${d.getMonth() + 1}-${d.getDate()}`
                        const key = `${dateKey}__${e.raw_emotion}`
                        if (!heatData[key]) heatData[key] = { count: 0, totalIntensity: 0 }
                        heatData[key].count += 1
                        heatData[key].totalIntensity += e.intensity
                      })

                      return (
                        <div style={{ gridColumn: fullSpan, background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <p style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>감정 히트맵</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontSize: 16, padding: '0 4px' }}>‹</button>
                              <span style={{ fontSize: 13, color: t.text }}>{headerLabel}</span>
                              <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontSize: 16, padding: '0 4px' }}>›</button>
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: t.muted, marginBottom: 16 }}>색이 진할수록 강도 높음 · 숫자는 횟수 · 셀 클릭 시 상세 보기</p>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: `40px repeat(${displayDays.length}, 1fr)`,
                            gap: 3,
                          }}>
                            {/* 날짜 헤더 */}
                            <div />
                            {displayDays.map((d, i) => {
                              const isToday = d.toDateString() === new Date().toDateString()
                              const isSun = d.getDay() === 0
                              const isSat = d.getDay() === 6
                              const holidayKey = `${d.getMonth() + 1}-${d.getDate()}`
                              const isHoliday = !!holidays[holidayKey]
                              const dateColor = isToday ? '#a78bfa'
                                : (isSun || isHoliday) ? '#f87171'
                                : isSat ? '#60a5fa'
                                : t.muted
                              return (
                                <div key={i} style={{
                                  textAlign: 'center', fontSize: 9,
                                  color: dateColor, paddingBottom: 4,
                                  fontWeight: isToday ? 700 : 400,
                                }}>
                                  {d.getDate()}
                                </div>
                              )
                            })}

                            {/* 감정별 행 */}
                            {emotionList.map(emotion => {
                              const color = emotionColors[emotion] ?? '#a78bfa'
                              return [
                                <div key={`label-${emotion}`} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: t.text }}>{emotion}</span>
                                </div>,

                                ...displayDays.map((d, i) => {
                                  const isFuture = d > new Date()
                                  const dateKey = `${d.getMonth() + 1}-${d.getDate()}`
                                  const key = `${dateKey}__${emotion}`
                                  const cell = heatData[key]
                                  const avgIntensity = cell ? cell.totalIntensity / cell.count : 0
                                  const alphaHex = cell
                                    ? Math.round((avgIntensity / 5) * 220 + 35).toString(16).padStart(2, '0')
                                    : '14'
                                  const fullDateKey = d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

                                  return (
                                    <div
                                      key={i}
                                      onClick={() => {
                                        if (cell) {
                                          setSelectedDay(fullDateKey)
                                          setSelectedEmotion(emotion)
                                          setCalModalOpen(true)
                                        }
                                      }}
                                      style={{
                                        height: 32, borderRadius: 6,
                                        background: `${color}${alphaHex}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700,
                                        color: cell ? (avgIntensity >= 3 ? '#fff' : isDark ? '#fff' : '#333') : 'transparent',
                                        cursor: cell ? 'pointer' : 'default',
                                        opacity: isFuture ? 0.3 : 1,
                                      }}
                                    >
                                      {cell ? cell.count : ''}
                                    </div>
                                  )
                                }),
                              ]
                            })}
                          </div>

                          {/* 모달 */}
                          {calModalOpen && selectedDay && selectedEmotion && (() => {
                            const allEntries = dashboardData.filter(e =>
                              new Date(e.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) === selectedDay
                              && e.raw_emotion === selectedEmotion
                            )
                            const parts = selectedDay.split('. ')
                            const dateLabel = `${parts[1]}월 ${parts[2]?.replace('.', '')}일`

                            return (
                              <div
                                onClick={() => setCalModalOpen(false)}
                                style={{
                                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                  zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
                                }}
                              >
                                <div
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    background: t.popup, border: `1px solid ${t.border}`,
                                    borderRadius: 20, padding: '24px 28px',
                                    width: '100%', maxWidth: 360,
                                    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: emotionColors[selectedEmotion] ?? '#a78bfa' }} />
                                      <span style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{dateLabel} · {selectedEmotion}</span>
                                    </div>
                                    <button onClick={() => setCalModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                                    {allEntries.map(e => (
                                      <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px', borderRadius: 12, background: t.hover }}>
                                        <span style={{ fontSize: 12, color: '#a78bfa' }}>강도 {e.intensity}</span>
                                        {e.trigger_text && <p style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, opacity: 0.7 }}>{e.trigger_text}</p>}
                                        {e.summary && <p style={{ fontSize: 13, color: t.muted, lineHeight: 1.6 }}>{e.summary}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })()}

                    {/* ② 총 기록 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 14, color: t.text, fontWeight: 500, marginBottom: 12 }}>총 기록</p>
                      <p style={{ fontSize: 36, fontWeight: 700, color: t.text, lineHeight: 1 }}>
                        {total}<span style={{ fontSize: 14, color: t.muted, marginLeft: 4 }}>회</span>
                      </p>
                    </div>

                    {/* ③ 감정별 평균 강도 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 14, color: t.text, fontWeight: 500, marginBottom: 16 }}>감정별 평균 강도</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {Object.entries(
                          dashboardData.reduce((acc, e) => {
                            if (!acc[e.raw_emotion]) acc[e.raw_emotion] = { sum: 0, count: 0 }
                            acc[e.raw_emotion].sum += e.intensity
                            acc[e.raw_emotion].count += 1
                            return acc
                          }, {} as Record<string, { sum: number; count: number }>)
                        )
                        .map(([emotion, { sum, count }]) => ({ emotion, avg: sum / count }))
                        .sort((a, b) => b.avg - a.avg)
                        .map(({ emotion, avg }) => (
                          <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: emotionColors[emotion] ?? '#a78bfa' }} />
                            <span style={{ fontSize: 13, color: t.text, width: 36, flexShrink: 0 }}>{emotion}</span>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: t.border }}>
                              <div style={{ width: `${(avg / 5) * 100}%`, height: '100%', borderRadius: 3, background: emotionColors[emotion] ?? '#a78bfa' }} />
                            </div>
                            <span style={{ fontSize: 12, color: t.muted, width: 28, textAlign: 'right', flexShrink: 0 }}>{avg.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 4. 감정 빈도 */}
                    <div style={{ background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px' }}>
                      <p style={{ fontSize: 14, color: t.text, fontWeight: 500, marginBottom: 8 }}>감정 빈도</p>
                      <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 32)}>
                        <BarChart data={barData} barSize={20} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 10, fill: t.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: t.text }} axisLine={false} tickLine={false} width={44} />
                          <Bar dataKey="count"
                            shape={(props: any) => {
                              const { x, y, width, height, payload } = props
                              return <rect x={x} y={y} width={width} height={height} fill={emotionColors[payload.name] ?? '#a78bfa'} rx={4} ry={4} />
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* ⑤ 이번주 vs 지난주 */}
                    {(thisWeekTop || lastWeekTop) && (
                      <div style={{
                        gridColumn: fullSpan,
                        background: t.sidebar, border: `1px solid ${t.border}`, borderRadius: 20, padding: '24px 28px',
                        display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 20 : 40,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: isMobile ? '100%' : 'auto' }}>
                          <div>
                            <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>이번 주 최다 감정</p>
                            <p style={{ fontSize: 24, fontWeight: 700, color: t.text }}>
                              {thisWeekTop ? <>{thisWeekTop[0]}<span style={{ fontSize: 13, color: t.muted, marginLeft: 4 }}>{thisWeekTop[1]}회</span></> : <span style={{ fontSize: 14, color: t.muted }}>기록 없음</span>}
                            </p>
                          </div>
                          <div style={{ fontSize: 16, color: t.muted }}>vs</div>
                          <div>
                            <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>지난 주 최다 감정</p>
                            <p style={{ fontSize: 24, fontWeight: 700, color: t.text }}>
                              {lastWeekTop ? <>{lastWeekTop[0]}<span style={{ fontSize: 13, color: t.muted, marginLeft: 4 }}>{lastWeekTop[1]}회</span></> : <span style={{ fontSize: 14, color: t.muted }}>기록 없음</span>}
                            </p>
                          </div>
                        </div>
                        {/* 구분선 */}
                        {!isMobile && <div style={{ width: 1, height: 40, background: t.border, flexShrink: 0 }} />}
                        <div style={{ height: isMobile ? 1 : 0, width: isMobile ? '100%' : 0, background: t.border }} />
                        {/* 대화 횟수 */}
                        <div style={{ marginLeft: isMobile ? 0 : 'auto' }}>
                          <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>대화 횟수</p>
                          <p style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{thisWeekData.length}회</p>
                          <p style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>지난 주 {lastWeekData.length}회</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

      </div>

      {/* ── 모바일 하단 탭바 ── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: `calc(56px + env(safe-area-inset-bottom, 0px))`,
          background: t.bg, borderTop: `1px solid ${t.border}`,
          display: 'flex', zIndex: 30,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {[
            {
              id: 'chat', label: '대화',
              icon: (color: string) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
              onClick: () => { 
                scrollInstant.current = true
                setView('chat')
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }), 0)
              },
            },
            {
              id: 'records', label: '기록',
              icon: (color: string) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              ),
              onClick: () => setView('records'),
            },
            {
              id: 'dashboard', label: '대시보드',
              icon: Icons.chart,
              onClick: () => setView('dashboard'),
            },
            {
              id: 'settings', label: '설정',
              icon: Icons.settings,
              onClick: () => setView('settings'),
            },
          ].map(tab => {
            const active = view === tab.id
            const color = active ? '#a78bfa' : t.muted
            return (
              <button key={tab.id} onClick={tab.onClick} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 4, height: 56,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                {tab.icon(color)}
                <span style={{ fontSize: 10, color: active ? '#a78bfa' : t.muted, lineHeight: 1 }}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.4); border-radius: 2px; }
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
  bg: '#0a0a0a', sidebar: '#0f0f0f', text: '#e8e8e8', muted: '#aaa',
  border: '#2a2a2a', aiMsg: '#161616', input: '#111', hover: '#1e1e1e', popup: '#161616',
}
const light = {
  bg: '#ffffff', sidebar: '#f9f9f9', text: '#111', muted: '#666',
  border: '#e5e5e5', aiMsg: '#f4f4f4', input: '#f9f9f9', hover: '#f0f0f0', popup: '#ffffff',
}
