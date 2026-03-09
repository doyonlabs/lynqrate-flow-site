'use client'

import { useTheme } from '@/context/ThemeContext'

export default function Landing() {
  const { isDark } = useTheme()

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
    statNumColor: '#f0f0f8',
    techHighlightBg: '#a78bfa11',
    techHighlightBorder: '#a78bfa44',
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
    statNumColor: '#1a1a2e',
    techHighlightBg: '#ede9fe',
    techHighlightBorder: '#7c3aed44',
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
          font-size: clamp(42px, 7vw, 80px); font-weight: 700;
          color: ${t.text}; line-height: 1.2; margin-bottom: 24px;
          animation: fadeUp 0.8s 0.1s ease both;
        }

        .hero-title span {
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .hero-sub {
          font-size: clamp(15px, 2vw, 18px); color: ${t.muted};
          line-height: 1.8; max-width: 520px; margin: 0 auto 48px;
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

        .btn-secondary {
          padding: 14px 32px; border-radius: 24px;
          background: transparent; border: 1px solid ${t.border};
          color: ${t.muted}; font-size: 15px;
          text-decoration: none; font-family: inherit;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-secondary:hover { border-color: ${t.accent}; color: ${t.accent}; }

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

        .tech { max-width: 1100px; margin: 0 auto; padding: 0 24px 100px; position: relative; z-index: 1; }

        .tech-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 40px; }

        .tech-tag {
          padding: 8px 16px; border-radius: 20px;
          background: ${t.surface}; border: 1px solid ${t.border};
          font-size: 13px; color: ${t.muted};
          font-family: 'SF Mono', 'Fira Code', monospace;
          transition: border-color 0.2s, color 0.2s;
        }
        .tech-tag:hover { border-color: ${t.accent}; color: ${t.accent}; }

        .tech-tag.highlight {
          border-color: ${t.techHighlightBorder};
          color: ${t.accent}; background: ${t.techHighlightBg};
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
        .footer-stack { font-size: 11px; color: ${t.muted}; font-family: 'SF Mono', 'Fira Code', monospace; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .feature-grid, .steps { grid-template-columns: 1fr; }
          nav { padding: 16px 24px; }
          .step { border-right: none; border-bottom: 1px solid ${t.border}; }
          .step:last-child { border-bottom: none; }
        }
      `}</style>

      <div className="landing" style={{ background: t.bg }}>
        <nav>
          <a href="/" className="nav-logo">
            <div className="nav-logo-mark">✦</div>
            Mind Echo
          </a>
          <a href="/form" className="nav-cta">무료로 시작하기</a>
        </nav>

        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-label"><span>✦</span> AI 감정 대화 서비스</div>
          <h1 className="hero-title">
            털어놓는 것만으로<br />
            <span>패턴이 보입니다</span>
          </h1>
          <p className="hero-sub">
            ChatGPT처럼 대화하되, 대화가 끝나면 감정 데이터가 쌓입니다.<br />
            시간이 지날수록 내가 어떤 상황에서 힘든지 보이기 시작해요.
          </p>
          <div className="hero-actions">
            <a href="/form" className="btn-primary">지금 털어놓기</a>
            <a href="#features" className="btn-secondary">어떻게 다른가요?</a>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-label">왜 Mind Echo인가</div>
          <h2 className="section-title">ChatGPT와 다른 단 하나의 이유</h2>
          <p className="section-sub">대화는 사라지지 않습니다. 감정 데이터로 쌓여서 패턴이 됩니다.</p>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <div className="feature-title">가볍게 털어놓기</div>
              <div className="feature-desc">치료나 상담이 아닙니다. 답답한 마음을 편하게 꺼내놓는 것으로 시작해요. AI가 먼저 충분히 듣습니다.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <div className="feature-title">자동 감정 추출</div>
              <div className="feature-desc">대화가 끝나면 AI가 감정, 강도, 트리거를 자동으로 추출합니다. 따로 기록할 필요 없어요.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✦</div>
              <div className="feature-title">패턴 시각화</div>
              <div className="feature-desc">데이터가 쌓이면 대시보드에서 내 감정 흐름이 보입니다. 어떤 상황에서 힘든지 스스로 알게 돼요.</div>
            </div>
          </div>
        </section>

        <section className="how">
          <div className="section-label">사용 흐름</div>
          <h2 className="section-title">3단계로 끝납니다</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-title">구글 로그인</div>
              <div className="step-desc">별도 회원가입 없이 구글 계정으로 바로 시작합니다.</div>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-title">감정 대화</div>
              <div className="step-desc">오늘 있었던 일, 답답한 것, 뭐든 편하게 채팅으로 털어놔요.</div>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-title">패턴 확인</div>
              <div className="step-desc">대화 종료 버튼을 누르면 감정이 기록되고 대시보드에 쌓입니다.</div>
            </div>
          </div>
        </section>

        <section className="tech">
          <div className="section-label">기술 스택</div>
          <h2 className="section-title">1인 풀스택 개발</h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>기획, 디자인, 개발, 배포까지 혼자 만들었습니다.</p>
          <div className="tech-grid">
            <span className="tech-tag highlight">Next.js 15</span>
            <span className="tech-tag highlight">TypeScript</span>
            <span className="tech-tag highlight">Supabase</span>
            <span className="tech-tag highlight">GPT-4o-mini</span>
            <span className="tech-tag">Tailwind CSS v4</span>
            <span className="tech-tag">Supabase Auth</span>
            <span className="tech-tag">Google OAuth</span>
            <span className="tech-tag">PostgreSQL</span>
            <span className="tech-tag">Row Level Security</span>
            <span className="tech-tag">Vercel</span>
            <span className="tech-tag">Recharts</span>
            <span className="tech-tag">App Router</span>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-card">
            <h2 className="cta-title">오늘 하루 어땠나요?</h2>
            <p className="cta-sub">잘 모르겠다면, 그냥 털어놔 보세요.<br />AI가 먼저 들어드릴게요.</p>
            <a href="/form" className="btn-primary" style={{ display: 'inline-block', position: 'relative' }}>
              무료로 시작하기
            </a>
          </div>
        </section>

        <footer>
          <div className="footer-text">© 2026 Mind Echo · Lynqrate</div>
          <div className="footer-stack">Next.js · Supabase · GPT-4o-mini · Vercel</div>
        </footer>
      </div>
    </>
  )
}
