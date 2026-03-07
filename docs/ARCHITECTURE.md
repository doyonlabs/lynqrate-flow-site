# Mind-Echo 아키텍처 문서

> 마지막 업데이트: 2026-03-07

---

## 서비스 개요

감정을 채팅으로 털어놓으면 GPT가 공감하고, 대화 종료 시 감정 데이터를 자동 추출해 대시보드에서 패턴을 시각화하는 AI 감정 대화 서비스.

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
[/auth/callback] → public.users + subscriptions 자동 생성
        ↓
[채팅 /form] ← 로그인 필수
        ↓ 메시지 전송마다
[POST /api/chat] → GPT-4o-mini 호출 → chat_messages 저장
        ↓ 대화 종료 버튼
[POST /api/chat/extract] → GPT 감정 추출 → emotion_entries 저장
        ↓
[대시보드 /form 내 dashboard 뷰] ← 사이드바에서 뷰 전환
```

---

## 페이지 구조

| 경로 | 역할 | 로그인 필요 |
|------|------|------------|
| `/login` | Google 소셜 로그인 | ❌ |
| `/form` | 채팅 + 설정/대시보드 뷰 | ✅ |

> `/result`, `/feedback`, `/dashboard` 별도 페이지 없음 — `/form` 내부 view 상태로 전환

---

## 인증 구조

```
Google 로그인 클릭
→ supabase.auth.signInWithOAuth({ provider: 'google' })
→ Google 인증 완료
→ /auth/callback?code=... 리다이렉트
→ exchangeCodeForSession(code) → Supabase 세션 생성
→ public.users upsert (없으면 생성 + subscriptions free 플랜 생성, 있으면 updated_at 업데이트)
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
| `src/app/auth/callback/route.ts` | OAuth 콜백 처리 + public.users + subscriptions 생성 |
| `src/app/login/page.tsx` | 로그인 페이지 UI |
| `src/components/FormClient.tsx` | 채팅 UI + 설정/대시보드 뷰 |
| `src/app/api/chat/route.ts` | 채팅 API Route (GPT 대화 + chat_messages 저장) |
| `src/app/api/chat/extract/route.ts` | 대화 종료 시 감정 추출 + emotion_entries 저장 |
| `src/middleware.ts` | 비로그인 접근 차단 + 로그인 상태에서 /login 접근 시 /form 리다이렉트 |

---

## 미들웨어 보호 라우트

```
/form → 비로그인 시 /login으로 리다이렉트
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

### POST /api/chat

**역할**: 대화 히스토리 누적 → GPT-4o-mini 호출 → chat_messages 저장 → 답변 반환

**요청 바디**:
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "sessionId": "uuid (없으면 신규 세션 생성)"
}
```

**응답**:
```json
{
  "reply": "AI 답변",
  "sessionId": "uuid"
}
```

**처리 순서**:
1. 로그인 유저 확인
2. sessionId 없으면 chat_sessions 신규 생성
3. 유저 메시지 chat_messages 저장
4. GPT-4o-mini 호출
5. AI 답변 chat_messages 저장
6. reply + sessionId 반환

---

### POST /api/chat/extract

**역할**: 대화 종료 시 전체 대화에서 감정 데이터 추출 → emotion_entries 저장

**요청 바디**:
```json
{
  "messages": [{ "role": "user|assistant", "content": "..." }],
  "sessionId": "uuid"
}
```

**응답**:
```json
{
  "emotion": "불안",
  "intensity": 4,
  "trigger": "상황 설명",
  "summary": "AI 코치 한두 문장 정리"
}
```

**처리 순서**:
1. 로그인 유저 확인
2. GPT-4o-mini 호출 (JSON 추출, temperature 0.3)
3. emotion_entries 저장
4. chat_sessions.ended_at 업데이트

---

## DB 구조

### 핵심 테이블 관계

```
auth.users (Supabase 관리)
    ↓ id 연동 (로그인 시 자동)
public.users
    ↓
subscriptions (구독 관리)
monthly_usage (무료 플랜 월별 사용량)
chat_sessions (대화 세션)
    ↓
chat_messages (메시지 원문)
emotion_entries (감정 추출 데이터 — 대시보드 원천)
standard_emotions (표준 감정 분류 — 향후 활성화 예정)
```

### 주요 테이블 설명

| 테이블 | 역할 |
|--------|------|
| `public.users` | 서비스 사용자 정보 |
| `subscriptions` | 구독 관리 (free/pro, active/cancelled/expired) |
| `monthly_usage` | 무료 플랜 월별 사용량 추적 (월 5회 제한) |
| `chat_sessions` | 대화 세션 단위 (사이드바 목록) |
| `chat_messages` | 세션별 메시지 원문 (role: user/assistant) |
| `emotion_entries` | 대화 종료 시 GPT 추출 감정 데이터 (대시보드 분석 원천) |
| `standard_emotions` | 표준 감정 분류 (향후 매칭 로직 활성화 예정) |

### 스키마 파일

```
supabase/
  schema.sql   — 현재 최신 전체 스키마
```

---

## 수익 모델

| 플랜 | 내용 |
|------|------|
| 무료 | 채팅 + 기본 피드백 월 5회 |
| Pro | 대시보드 패턴 분석 + 무제한 기록 + 감정 리포트 |

- 월 4,900원 내외 구독료 검토 중
- 구독 전환 트리거: 대시보드에서 패턴이 보이기 시작하는 순간

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

```
src/lib/session.ts           ← 이용권 코드 JWT 세션
src/app/revisit/             ← 재방문 코드 입력 페이지
src/app/api/revisit/         ← 재방문 코드 관련 API
src/app/api/session/         ← 세션 발급 API
src/app/api/analyze/         ← 구 5문항 폼 기반 분석 API
```

---

## 배포 구조

| 환경 | 도메인 | 브랜치 | DB |
|------|--------|--------|-----|
| 로컬 | localhost:3000 | - | 개발 Supabase |
| 운영 | app.lynqrateflow.com | main | 운영 Supabase |

---

## 다음 작업 예정

- [x] 채팅형 UI 전환 (FormClient.tsx 재설계)
- [x] 채팅 API Route (/api/chat)
- [x] 대화 종료 감정 추출 API Route (/api/chat/extract)
- [x] DB 스키마 재설계 (구독 모델 + 채팅형 반영)
- [x] DB 연결 (chat_sessions, chat_messages, emotion_entries 저장)
- [x] Google OAuth 재연동 (새 Supabase 프로젝트)
- [ ] 사이드바 과거 대화 목록 실제 데이터 연동
- [ ] 사용자 이름/이메일 Supabase에서 가져오기
- [ ] 로그아웃 기능 구현
- [ ] 대시보드 뷰 구현 (누적 통계 시각화)
- [ ] 월별 사용량 체크 로직 (monthly_usage)
- [ ] 구독 모델 연동
- [ ] standard_emotions 매칭 로직 활성화
- [ ] 카카오 로그인 추가
- [ ] 결제 연동 (Toss Payments)
- [ ] 레거시 코드 제거
