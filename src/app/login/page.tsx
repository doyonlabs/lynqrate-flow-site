'use client'

import { createBrowserSupabaseClient } from '@/lib/supabaseBrowser'
import { useTheme } from '@/context/ThemeContext'
import { useState } from 'react'

export default function LoginPage() {
  const supabase = createBrowserSupabaseClient()
  const { isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [pressed, setPressed] = useState(false)

  const t = isDark ? dark : light

  async function handleGoogleLogin() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s',
      padding: '0 20px',
    }}>

      <div style={{
        width: '100%',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* 로고 */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff', marginBottom: 24,
          boxShadow: '0 4px 24px rgba(167,139,250,0.25)',
        }}>✦</div>

        {/* 타이틀 */}
        <h1 style={{
          fontSize: 26, fontWeight: 600, color: t.text,
          letterSpacing: '-0.02em', marginBottom: 8, textAlign: 'center',
        }}>
          Mind Echo 시작하기
        </h1>

        <p style={{
          fontSize: 14, color: t.muted, marginBottom: 36,
          textAlign: 'center', lineHeight: 1.6,
        }}>
          감정을 기록하고 AI 피드백을 받아보세요
        </p>

        {/* 구글 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => {
            setPressed(false)
          }}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: pressed ? t.btnHover : t.btnBg,
            border: `1px solid ${t.border}`,
            borderRadius: 10, padding: '13px 20px',
            fontSize: 14, fontWeight: 500, color: t.btnText,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            transform: pressed ? 'scale(0.98)' : 'scale(1)',
            boxShadow: pressed ? 'none' : isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {!loading && (
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
          )}
          {loading ? '연결 중...' : 'Google로 계속하기'}
        </button>

        <div style={{ width: '100%', height: 1, background: t.border, margin: '28px 0', opacity: 0.6 }} />

        <p style={{
          fontSize: 12, color: t.subtle, textAlign: 'center', lineHeight: 1.7,
        }}>
          계속하면 Mind Echo의{' '}
          <span style={{ color: t.muted, textDecoration: 'underline', cursor: 'pointer' }}>서비스 약관</span>
          {' '}및{' '}
          <span style={{ color: t.muted, textDecoration: 'underline', cursor: 'pointer' }}>개인정보 처리방침</span>
          에 동의하는 것으로 간주됩니다
        </p>
      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </main>
  )
}

const dark = {
  bg: '#0a0a0a', text: '#f0f0f0', muted: '#666', subtle: '#3a3a3a',
  border: '#2a2a2a', btnBg: '#161616', btnHover: '#1e1e1e', btnText: '#e8e8e8',
}

const light = {
  bg: '#ffffff', text: '#111', muted: '#888', subtle: '#bbb',
  border: '#e5e5e5', btnBg: '#ffffff', btnHover: '#f5f5f5', btnText: '#111',
}
