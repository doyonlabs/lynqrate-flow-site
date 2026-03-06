# Mind-Echo 아키텍처 문서

> 마지막 업데이트: 2026-03-06

---

## 서비스 개요

감정과 상황을 입력하면 GPT가 분석해서 피드백을 제공하는 AI 감정 기록 서비스.

- **프론트엔드**: Next.js (App Router) + TypeScript + Tailwind CSS v4
- **백엔드**: Next.js API Routes
- **DB**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (Google OAuth)
- **AI**: GPT-4o-mini API
- **배포**: Vercel

---

## 전체 서비스 흐름

```
[로그인 페이지 /login]
        ↓ Google 소셜 로그인
[Google OAuth → Supabase Auth]
        ↓ 인증 완료
[/auth/callback] → public.users 자동 생성
        ↓
[감정 입력 폼 /form] ← 로그인 필수
        ↓ 폼 제출
[POST /api/analyze] → GPT-4o-mini 호출
        ↓ 분석 완료
[피드백 말풍선 — /form 내부에서 표시]
        ↓
[대시보드 /dashboard] ← 사이드바에서 뷰 전환
```

---

## 페이지 구조

| 경로 | 역할 | 로그인 필요 |
|------|------|------------|
| `/login` | Google 소셜 로그인 | ❌ |
| `/form` | 감정 입력 폼 + 피드백 말풍선 + 설정/대시보드 뷰 | ✅ |
| `/dashboard` | 누적 사용기록 시각화 (예정) | ✅ |

> `/result`, `/feedback` 별도 페이지 없음 — `/form` 내부 view 상태로 전환

---

## 인증 구조

```
Google 로그인 클릭
→ supabase.auth.signInWithOAuth({ provider: 'google' })
→ Google 인증 완료
→ /auth/callback?code=... 리다이렉트
→ exchangeCodeForSession(code) → Supabase 세션 생성
→ public.users에 row upsert (없으면 생성, 있으면 updated_at 업데이트)
→ /form으로 이동
```

### 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/supabaseBrowser.ts` | 브라우저용 Supabase 클라이언트 (anon key) |
| `src/lib/supabaseServer.ts` | 서버용 Supabase 클라이언트 (쿠키 기반 세션) |
| `src/lib/supabaseAdmin.ts` | 관리자용 Supabase 클라이언트 (service role key) |
| `src/lib/themeCookie.ts` | 테마 쿠키 저장/읽기 유틸 |
| `src/context/ThemeContext.tsx` | 다크/라이트 테마 전역 상태 관리 |
| `src/app/auth/callback/route.ts` | OAuth 콜백 처리 + public.users 생성 |
| `src/app/login/page.tsx` | 로그인 페이지 UI |
| `src/components/FormClient.tsx` | 폼 + 피드백 말풍선 + 설정/대시보드 뷰 |
| `src/app/api/analyze/route.ts` | GPT 분석 API Route |
| `src/middleware.ts` | 비로그인 접근 차단 + 로그인 상태에서 /login 접근 시 /form 리다이렉트 |

---

## 미들웨어 보호 라우트

```
/form, /dashboard → 비로그인 시 /login으로 리다이렉트
/login → 로그인 상태 시 /form으로 리다이렉트
www.lynqrateflow.com → app.lynqrateflow.com으로 영구 리다이렉트 (308)
```

---

## 테마 시스템

```
최초 방문 → 쿠키 없음 → 기본값 dark
테마 토글 → setThemeCookie() → 쿠키 저장
페이지 로드 → layout.tsx에서 쿠키 읽기 → SSR 단계에서 테마 결정
→ 깜빡임(flash) 없음
```

---

## API Route

### POST /api/analyze

**역할**: 감정 입력값 검증 → GPT-4o-mini 호출 → 피드백 반환

**요청 바디**:
```json
{
  "emotion": "불안",
  "intensity": 4,
  "story": "오늘 있었던 일...",
  "feedbackType": "공감과 위로",
  "tone": "친근체"
}
```

**응답**:
```json
{
  "status": "ok",
  "feedback": "피드백 텍스트"
}
```

**처리 순서**:
1. 로그인 유저 확인
2. 필수값 검증 + 공백 방지 (normalizeWhitespace)
3. XSS 방지 (escapeHtml)
4. GPT-4o-mini 호출 (JSON 응답 형식)
5. TODO: DB 저장 (emotion_entries, emotion_feedbacks) — DB 연결 후 활성화

---

## DB 구조

### 핵심 테이블 관계

```
auth.users (Supabase 관리)
    ↓ id 연동 (로그인 시 자동)
public.users
    ↓
user_passes (이용권)
    ↓
emotion_entries (감정 기록)
    ↓
emotion_feedbacks (GPT 피드백)
```

### 주요 테이블 설명

| 테이블 | 역할 |
|--------|------|
| `public.users` | 서비스 사용자 정보 |
| `user_passes` | 이용권 관리 (사용 횟수, 만료일) |
| `emotion_entries` | 감정/상황 입력 기록 |
| `emotion_feedbacks` | GPT 생성 피드백 |
| `standard_emotions` | 표준 감정 분류 (향후 매칭 로직 활성화 예정) |

---

## 환경변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 브라우저 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 일반 권한 키 | 브라우저 |
| `SUPABASE_URL` | Supabase URL | 서버만 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 권한 키 | 서버만 |
| `OPENAI_API_KEY` | OpenAI API 키 | 서버만 |

---

## 레거시 코드 (제거 예정)

Google 로그인 전환 완료 후 삭제할 것들:

```
src/lib/session.ts           ← 이용권 코드 JWT 세션
src/app/revisit/             ← 재방문 코드 입력 페이지
src/app/api/revisit/         ← 재방문 코드 관련 API
src/app/api/session/         ← 세션 발급 API
```

---

## 배포 구조

| 환경 | 도메인 | 브랜치 | DB |
|------|--------|--------|-----|
| 로컬 | localhost:3000 | - | 운영 Supabase |
| 개발 | dev.lynqrateflow.com | hotfix/prod-flow-dev-env | 운영 Supabase |
| 운영 | app.lynqrateflow.com | main | 운영 Supabase |

> 현재 DB는 하나로 통합 운영 중. 사용자 증가 시 분리 예정.

---

## 다음 작업 예정

- [x] /form 페이지 구현 (감정 입력 폼 + 피드백 말풍선)
- [x] GPT 분석 API Route (Make.com → Next.js 전환)
- [x] 다크/라이트 테마 (쿠키 기반 SSR)
- [x] 설정 뷰 (/form 내부 뷰 전환)
- [ ] DB 연결 (emotion_entries, emotion_feedbacks 저장)
- [ ] 사이드바 과거 기록 실제 데이터 연동
- [ ] 사용자 이름/이메일 Supabase에서 가져오기
- [ ] 로그아웃 기능 구현
- [ ] /dashboard 뷰 구현 (누적 통계 시각화)
- [ ] 이용권 로직 연동 (user_passes)
- [ ] standard_emotions 매칭 로직 활성화
- [ ] 카카오 로그인 추가
- [ ] 결제 연동 (Toss Payments)
- [ ] 레거시 코드 제거
