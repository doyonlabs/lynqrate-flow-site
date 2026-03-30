'use client'

import { useTheme } from '@/context/ThemeContext'

export default function Privacy() {
  const { isDark } = useTheme()

  const t = isDark ? {
    bg: '#0d0d1a', text: '#f0f0f8', muted: '#9090b0',
    border: '#1e1e30', surface: '#14142a', accent: '#a78bfa',
  } : {
    bg: '#f5f5fa', text: '#1a1a2e', muted: '#666680',
    border: '#e4e4f0', surface: '#ffffff', accent: '#7c3aed',
  }

  return (
    <div style={{ background: t.bg, minHeight: '100vh', padding: '80px 24px', fontFamily: 'Noto Sans KR, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ fontSize: 13, color: t.accent, textDecoration: 'none', display: 'block', marginBottom: 40 }}>← Mind Echo로 돌아가기</a>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 8 }}>개인정보처리방침</h1>
        <p style={{ fontSize: 13, color: t.muted, marginBottom: 48 }}>최종 업데이트: 2026년 3월 30일</p>

        {[
          {
            title: '1. 수집하는 개인정보',
            content: 'Mind Echo는 서비스 제공을 위해 다음 정보를 수집합니다.\n\n• 구글 로그인 시: 이메일 주소, 프로필 이름\n• 서비스 이용 시: 대화 내용, 감정 기록 데이터\n• 결제 시: 결제 처리에 필요한 정보 (Creem을 통해 처리되며 카드 정보는 직접 수집하지 않습니다)'
          },
          {
            title: '2. 개인정보 이용 목적',
            content: '수집한 정보는 다음 목적으로만 사용됩니다.\n\n• 서비스 제공 및 개인화된 감정 분석\n• 구독 관리 및 결제 처리\n• 서비스 개선 및 오류 수정'
          },
          {
            title: '3. 개인정보 보관 및 처리',
            content: '수집된 데이터는 Supabase (미국 서버)에 저장됩니다. 회원 탈퇴 시 모든 데이터는 즉시 삭제됩니다. 대화 내용 및 감정 데이터는 본인 외에 열람할 수 없습니다.'
          },
          {
            title: '4. 제3자 제공',
            content: '수집한 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 Creem에 필요한 최소한의 정보가 전달됩니다.'
          },
          {
            title: '5. 이용자의 권리',
            content: '이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n\n• 개인정보 열람 요청\n• 개인정보 삭제 요청 (서비스 내 회원 탈퇴 기능)\n• 개인정보 처리 정지 요청\n\n문의: hello@lynqrateflow.com'
          },
          {
            title: '6. 문의',
            content: '개인정보 처리에 관한 문의는 아래로 연락 주세요.\n\n이메일: hello@lynqrateflow.com\n운영자: 김도영'
          },
        ].map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 12 }}>{title}</h2>
            <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}