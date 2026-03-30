'use client'

import { useTheme } from '@/context/ThemeContext'

export default function Terms() {
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
        <h1 style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 8 }}>이용약관</h1>
        <p style={{ fontSize: 13, color: t.muted, marginBottom: 48 }}>최종 업데이트: 2026년 3월 30일</p>

        {[
          {
            title: '1. 서비스 소개',
            content: 'Mind Echo는 AI 감정 대화 및 패턴 분석 서비스입니다. 본 약관은 Mind Echo 서비스 이용에 관한 조건을 규정합니다.'
          },
          {
            title: '2. 서비스 이용',
            content: '• 만 14세 이상이면 누구나 이용 가능합니다.\n• 구글 계정으로 로그인하여 서비스를 이용합니다.\n• 서비스는 정신건강 전문 상담을 대체하지 않습니다. 심각한 정신건강 문제는 전문가와 상담하시기 바랍니다.'
          },
          {
            title: '3. 구독 및 결제',
            content: '• 무료 플랜: 기본 기능 제공\n• Pro 플랜: $6.99/월, 구독 시 자동 갱신\n• 구독 취소는 언제든지 가능하며, 취소 후 현재 결제 기간 종료까지 서비스 이용 가능\n• 환불은 결제일로부터 7일 이내 요청 시 처리됩니다. 문의: hello@lynqrateflow.com'
          },
          {
            title: '4. 이용자 의무',
            content: '• 타인의 개인정보를 무단으로 입력하지 않습니다.\n• 서비스를 불법적인 목적으로 이용하지 않습니다.\n• 서비스의 정상적인 운영을 방해하는 행위를 하지 않습니다.'
          },
          {
            title: '5. 서비스 변경 및 중단',
            content: '운영자는 서비스 내용을 변경하거나 중단할 수 있습니다. 중요한 변경 사항은 서비스 내 공지 또는 이메일로 사전 안내합니다.'
          },
          {
            title: '6. 면책조항',
            content: 'Mind Echo는 이용자가 서비스를 통해 얻은 정보로 인한 손해에 대해 책임을 지지 않습니다. 서비스는 정신건강 전문 서비스가 아니며, 위기 상황에서는 전문 기관에 도움을 요청하시기 바랍니다.'
          },
          {
            title: '7. 문의',
            content: '서비스 이용 관련 문의는 아래로 연락 주세요.\n\n이메일: hello@lynqrateflow.com\n운영자: 김도영'
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