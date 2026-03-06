'use client'

import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const t = isDark ? dark : light

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, color: t.text,
      fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      transition: 'background 0.3s',
    }}>
      {/* 헤더 */}
      <div style={{
        height: 52, borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        background: t.bg,
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: t.muted, fontSize: 18, padding: 4,
        }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>설정</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>

        {/* 화면 섹션 */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 12 }}>화면</p>
          <div style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>다크 모드</div>
                <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                  {isDark ? '다크 모드 사용 중' : '라이트 모드 사용 중'}
                </div>
              </div>
              {/* 토글 스위치 */}
              <button onClick={toggleTheme} style={{
                width: 44, height: 24, borderRadius: 12,
                background: isDark ? '#a78bfa' : '#d1d5db',
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background 0.3s', flexShrink: 0,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: isDark ? 23 : 3,
                  transition: 'left 0.3s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* 계정 섹션 */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: t.muted, letterSpacing: '0.08em', marginBottom: 12 }}>계정</p>
          <div style={{
            background: t.card, border: `1px solid ${t.border}`,
            borderRadius: 14, overflow: 'hidden',
          }}>
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
              로그아웃
            </button>
          </div>
        </div>

      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  )
}

const dark = {
  bg: '#0a0a0a', text: '#e8e8e8', muted: '#555',
  border: '#1e1e1e', card: '#111',
}
const light = {
  bg: '#ffffff', text: '#111', muted: '#999',
  border: '#e5e5e5', card: '#f9f9f9',
}
