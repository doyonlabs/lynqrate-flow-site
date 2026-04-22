'use client'

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

export default function Landing() {
  const { isDark } = useTheme()
  const [modalSrc, setModalSrc] = useState<string | null>(null)

  const t = isDark ? {
    bg: '#0d0d1a',
    surface: '#14142a',
    border: '#1e1e30',
    text: '#f0f0f8',
    muted: '#9090b0',
    accent: '#a78bfa',
    accentBlue: '#60a5fa',
    glowColor: '#a78bfa18',
    cardHoverBorder: '#a78bfa44',
    ctaGrad: 'linear-gradient(135deg, #7c3aed22, #3b82f622)',
    ctaBorder: '#a78bfa33',
    ctaGlow: '#a78bfa15',
    navBg: 'rgba(8, 8, 16, 0.85)',
    techHighlightBg: '#a78bfa11',
  } : {
    bg: '#f5f5fa',
    surface: '#ffffff',
    border: '#e4e4f0',
    text: '#1a1a2e',
    muted: '#666680',
    accent: '#7c3aed',
    accentBlue: '#2563eb',
    glowColor: '#a78bfa12',
    cardHoverBorder: '#7c3aed44',
    ctaGrad: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
    ctaBorder: '#7c3aed33',
    ctaGlow: '#a78bfa10',
    navBg: 'rgba(245, 245, 250, 0.85)',
    techHighlightBg: '#ede9fe',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${t.bg}; }

        .landing { font-family: 'Noto Sans KR', sans-serif; min-height: 100vh; overflow-x: hidden; }

        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          border-bottom: 1px solid ${t.border};
          background: ${t.navBg};
          backdrop-filter: blur(12px);
        }

        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Gowun Batang', serif;
          font-size: 18px; color: ${t.text}; font-weight: 700; text-decoration: none;
        }

        .nav-logo-mark {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #fff;
        }

        .nav-cta {
          padding: 9px 22px; border-radius: 20px;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          color: #fff; font-size: 13px; font-weight: 500;
          text-decoration: none; font-family: inherit;
          transition: opacity 0.2s;
        }

        .nav-cta:hover { opacity: 0.85; }
        .nav-cta:active { transform: translateY(2px); opacity: 0.8; }

        .hero {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 120px 24px 80px; text-align: center; z-index: 1;
        }

        .hero-glow {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, ${t.glowColor} 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -60%); pointer-events: none;
        }

        .hero-label {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          border: 1px solid ${t.cardHoverBorder};
          background: ${t.techHighlightBg};
          font-size: 12px; color: ${t.accent};
          letter-spacing: 0.08em; margin-bottom: 32px;
          animation: fadeUp 0.8s ease both;
        }

        .hero-title {
          font-family: 'Gowun Batang', serif;
          font-size: clamp(32px, 6vw, 68px); font-weight: 700;
          color: ${t.text}; line-height: 1.4; margin-bottom: 24px;
          animation: fadeUp 0.8s 0.1s ease both;
        }

        .hero-title span {
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .hero-sub {
          font-size: clamp(17px, 2.2vw, 22px); color: ${t.muted};
          line-height: 1.8; max-width: 480px; margin: 0 auto 48px;
          animation: fadeUp 0.8s 0.2s ease both;
        }

        .hero-actions {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
          animation: fadeUp 0.8s 0.3s ease both;
        }

        .btn-primary {
          padding: 14px 32px; border-radius: 24px;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          color: #fff; font-size: 15px; font-weight: 600;
          text-decoration: none; font-family: inherit;
          transition: transform 0.2s, opacity 0.2s;
        }

        .btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        .btn-primary:active { transform: translateY(2px); opacity: 0.8; }

        .btn-secondary {
          padding: 14px 32px; border-radius: 24px;
          background: transparent; border: 1px solid ${t.border};
          color: ${t.muted}; font-size: 15px;
          text-decoration: none; font-family: inherit;
          transition: border-color 0.2s, color 0.2s;
        }
          
        .btn-secondary:hover { border-color: ${t.accent}; color: ${t.accent}; }
        .btn-secondary:active { transform: translateY(2px); opacity: 0.8; }

        .features {
          max-width: 1100px; margin: 0 auto;
          padding: 100px 24px; position: relative; z-index: 1;
        }

        .section-label {
          font-size: 11px; color: ${t.accent};
          letter-spacing: 0.12em; margin-bottom: 16px; text-transform: uppercase;
        }

        .section-title {
          font-family: 'Gowun Batang', serif;
          font-size: clamp(28px, 4vw, 42px); font-weight: 700;
          color: ${t.text}; line-height: 1.3; margin-bottom: 16px;
        }

        .section-sub {
          font-size: 15px; color: ${t.muted};
          line-height: 1.8; max-width: 480px; margin-bottom: 64px;
        }

        .feature-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }

        .feature-card {
          background: ${t.surface}; border: 1px solid ${t.border};
          border-radius: 20px; padding: 32px 28px;
          transition: border-color 0.3s, transform 0.3s;
        }
        .feature-card:hover { border-color: ${t.cardHoverBorder}; transform: translateY(-4px); }

        .feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: ${t.techHighlightBg};
          border: 1px solid ${t.cardHoverBorder};
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 20px;
        }

        .feature-title { font-size: 16px; font-weight: 600; color: ${t.text}; margin-bottom: 10px; }
        .feature-desc { font-size: 13px; color: ${t.muted}; line-height: 1.8; }

        .how { max-width: 1100px; margin: 0 auto; padding: 0 24px 100px; position: relative; z-index: 1; }

        .steps {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border: 1px solid ${t.border}; border-radius: 20px;
          overflow: hidden; margin-top: 64px;
        }

        .step {
          padding: 36px 32px; border-right: 1px solid ${t.border};
          background: ${t.surface}; position: relative;
        }
        .step:last-child { border-right: none; }

        .step-num {
          font-family: 'Gowun Batang', serif; font-size: 48px; font-weight: 700;
          color: ${isDark ? '#a78bfa22' : '#a78bfa44'};
          position: absolute; top: 20px; right: 24px; line-height: 1;
        }

        .step-title { font-size: 15px; font-weight: 600; color: ${t.text}; margin-bottom: 10px; margin-top: 8px; }
        .step-desc { font-size: 13px; color: ${t.muted}; line-height: 1.8; }

        .screenshot-card {
          background: ${t.surface};
          border: 1px solid ${t.border};
          border-radius: 20px; overflow: hidden;
          cursor: pointer; position: relative;
          transition: border-color 0.3s, transform 0.3s;
        }
        .screenshot-card:hover { border-color: ${t.cardHoverBorder}; transform: translateY(-4px); }
        .screenshot-hint {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 24px 12px 12px;
          background: linear-gradient(to top, rgba(0,0,0,0.55), transparent);
          font-size: 12px; color: #fff; text-align: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .screenshot-card:hover .screenshot-hint { opacity: 1; }

        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          padding: 24px; cursor: pointer;
        }
        .modal-img {
          max-width: 90vw; max-height: 90vh;
          border-radius: 16px; object-fit: contain; cursor: default;
        }
        .modal-close {
          position: absolute; top: 20px; right: 24px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: none;
          color: #fff; font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }

        .cta-section { max-width: 1100px; margin: 0 auto; padding: 0 24px 120px; position: relative; z-index: 1; }

        .cta-card {
          background: ${t.ctaGrad}; border: 1px solid ${t.ctaBorder};
          border-radius: 24px; padding: 64px 48px;
          text-align: center; position: relative; overflow: hidden;
        }

        .cta-card::before {
          content: ''; position: absolute;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, ${t.ctaGlow}, transparent 70%);
          top: -100px; left: 50%; transform: translateX(-50%); pointer-events: none;
        }

        .cta-title {
          font-family: 'Gowun Batang', serif;
          font-size: clamp(28px, 4vw, 40px); font-weight: 700;
          color: ${t.text}; margin-bottom: 16px; line-height: 1.3; position: relative;
        }

        .cta-sub {
          font-size: 15px; color: ${t.muted};
          margin-bottom: 40px; line-height: 1.8; position: relative;
        }

        footer {
          border-top: 1px solid ${t.border}; padding: 32px 48px;
          display: flex; align-items: center; justify-content: space-between;
          position: relative; z-index: 1;
        }

        .footer-text { font-size: 12px; color: ${t.muted}; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .feature-grid, .steps { grid-template-columns: 1fr; }
          nav { padding: 16px 24px; }
          .step { border-right: none; border-bottom: 1px solid ${t.border}; }
          .step:last-child { border-bottom: none; }
          .story-inner { grid-template-columns: 1fr; gap: 40px; }
          footer { flex-direction: column; gap: 12px; padding: 24px 16px; text-align: center; }
          #price-grid { gap: 8px; }
          #price-grid .feature-card { padding: 16px 10px; }
          #price-grid .feature-title { font-size: 13px; }
          #price-grid .btn-primary { padding: 10px 16px; font-size: 12px; border-radius: 16px; }
          #price-grid ul { font-size: 11px; line-height: 1.8; }
        }

        @media (max-width: 375px) {
          #price-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {modalSrc && (
        <div className="modal-overlay" onClick={() => setModalSrc(null)}>
          <button className="modal-close" onClick={() => setModalSrc(null)}>✕</button>
          <img src={modalSrc} alt="서비스 화면" className="modal-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="landing" style={{ background: t.bg }}>
        <nav>
          <a href="/" className="nav-logo">
            <div className="nav-logo-mark">✦</div>
            Mind Echo
          </a>
          <a href="/login" className="nav-cta">지금 시작하기</a>
        </nav>

        {/* 히어로 */}
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-label"><span>✦</span> AI 감정 대화 서비스</div>
          <h1 className="hero-title">
            털어놓고 싶은데<br />
            <span>털어놓을 데가 없어요.</span><br />
          </h1>
          <p className="hero-sub">
            Mind Echo에 털어놔요.<br />
            말하다 보면 내가 뭐에 힘든지<br />
            보이기 시작해요.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn-primary">지금 털어놓기</a>
            <a href="#features" className="btn-secondary">어떻게 달라요?</a>
          </div>
          <p style={{ fontSize: 12, color: t.muted, marginTop: 16 }}>
            🔒 기록은 나만 볼 수 있어요 · 광고 없음
          </p>
          <div style={{
            marginTop: 64,
            width: '100%',
            maxWidth: 900,
            position: 'relative',
            zIndex: 1,
          }}>
            <p style={{ fontSize: 14, color: t.muted, marginBottom: 16, textAlign: 'left' }}>
              실제 서비스 화면이에요
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { src: '/screenshots/chat.png', label: 'AI와 감정 대화' },
                { src: '/screenshots/dashboard-top.png', label: '감정 패턴 대시보드' },
                { src: '/screenshots/heatmap-cell.png', label: '날짜별 감정 상세' },
              ].map(({ src, label }) => (
                <div key={src} className="screenshot-card" onClick={() => setModalSrc(src)}>
                  <img src={src} alt={label} style={{ width: '100%', display: 'block' }} />
                  <div className="screenshot-hint">크게 보기</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 특징 */}
        <section className="features" id="features">
          <div className="section-label">왜 Mind Echo인가</div>
          <h2 className="section-title">말하는 것 이상이 일어나요</h2>
          <p className="section-sub">털어놓은 감정이 사라지지 않고 데이터가 돼요. 쌓이다 보면 내가 보여요.</p>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <div className="feature-title">판단 없이 들어요</div>
              <div className="feature-desc">오늘 열받은 거, 답답한 거, 기뻤던 거 — 뭐든 그냥 털어놔요. AI가 먼저 들어요.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div className="feature-title">자동으로 쌓여요</div>
              <div className="feature-desc">대화가 끝나면 AI가 감정, 강도, 상황을 자동으로 추출해요. 따로 기록 안 해도 돼요.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✦</div>
              <div className="feature-title">내가 보여요</div>
              <div className="feature-desc">어떤 날 힘든지, 어떤 상황에서 무너지는지 — 데이터가 쌓이면 패턴이 보여요.</div>
            </div>
          </div>
        </section>

        {/* 사용 흐름 */}
        <section className="how">
          <div className="section-label">사용 흐름</div>
          <h2 className="section-title">3단계로 끝납니다</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-title">구글 로그인</div>
              <div className="step-desc">별도 회원가입 없이 구글 계정으로 바로 시작해요.</div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-title">그냥 말해요</div>
              <div className="step-desc">오늘 있었던 거, 답답한 거, 기뻤던 거 — 뭐든 채팅으로 털어놔요.</div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-title">패턴이 보여요</div>
              <div className="step-desc">대화가 쌓이면 대시보드에서 내 감정 흐름이 보이기 시작해요.</div>
            </div>
          </div>
        </section>
        
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 100px', position: 'relative', zIndex: 1 }}>
          <div className="section-label">요금제</div>
          <h2 className="section-title">심플한 가격</h2>
          <div id="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 40 }}>
            <div className="feature-card">
              <div className="feature-title" style={{ textAlign: 'center' }}>무료</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: t.text, margin: '16px 0', textAlign: 'center' }}>$0</div>
              <ul style={{ fontSize: 13, color: t.muted, lineHeight: 2, listStyle: 'none', marginBottom: 24, textAlign: 'center' }}>
                <li>✓ 월 10회 감정 기록</li>
                <li>✓ 감정 히트맵 · 대시보드</li>
                <li style={{ color: t.accent }}>→ 패턴 보이면 Pro로</li>
              </ul>
              <div style={{ textAlign: 'center' }}>
                <a href="/login" className="btn-primary" style={{ display: 'inline-block', textAlign: 'center' }}>무료로 시작하기</a>
              </div>
            </div>
            <div className="feature-card" style={{ border: `1px solid ${t.cardHoverBorder}` }}>
              <div className="feature-title" style={{ textAlign: 'center' }}>Pro</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: t.accent, margin: '16px 0', textAlign: 'center' }}>$6.99<span style={{ fontSize: 14, color: t.muted }}>/월</span></div>
              <ul style={{ fontSize: 13, color: t.muted, lineHeight: 2, listStyle: 'none', marginBottom: 24, textAlign: 'center' }}>
                <li>✓ 무제한 감정 기록</li>
                <li>✓ 무제한 대화</li>
                <li>✓ 감정 패턴 시각화</li>
              </ul>
              <div style={{ textAlign: 'center' }}>
                <a href="/login" className="btn-primary" style={{ display: 'inline-block', textAlign: 'center' }}>시작하기</a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-card">
            <h2 className="cta-title">열받거나 지쳤나요?</h2>
            <p className="cta-sub">
              참지 말고 그냥 털어놔요.<br />
              말하다 보면 알게 돼요.
            </p>
            <a href="/login" className="btn-primary" style={{ display: 'inline-block', position: 'relative' }}>지금 털어놓기</a>
            <p style={{ fontSize: 12, color: t.muted, marginTop: 16, position: 'relative' }}>
              🔒 기록은 나만 볼 수 있어요 · 광고 없음
            </p>
          </div>
        </section>

        <footer>
          <div className="footer-text">© {new Date().getFullYear()} Mind Echo · Lynqrate</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="mailto:hello@lynqrateflow.com" style={{ fontSize: 12, color: t.muted, textDecoration: 'none' }}>hello@lynqrateflow.com</a>
            <a href="/privacy" style={{ fontSize: 12, color: t.muted, textDecoration: 'none' }}>개인정보처리방침</a>
            <a href="/terms" style={{ fontSize: 12, color: t.muted, textDecoration: 'none' }}>이용약관</a>
          </div>
        </footer>
      </div>
    </>
  )
}