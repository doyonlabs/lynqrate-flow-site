# Mind-Echo 아키텍처 문서

> 마지막 업데이트: 2026-03-12

---

## 서비스 개요

감정을 채팅으로 털어놓으면 GPT가 공감하고, 대화 종료 시 감정 데이터를 자동 추출해 대시보드에서 패턴을 시각화하는 AI 감정 대화 서비스.

- **프론트엔드**: Next.js (App Router) + TypeScript + Tailwind CSS v4
- **백엔드**: Next.js API Routes
- **DB**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (Google OAuth)
- **AI**: GPT-4o API
- **배포**: Vercel

---

## 전체 서비스 흐름

```
[랜딩 페이지 /]
        ↓ 무료로 시작하기 클릭
[로그인 페이지 /login]
        ↓ Google 소셜 로그인
[Google OAuth → Supabase Auth]
        ↓ 인증 완료
[/auth/callback] → public.users + subscriptions 자동 생성
        ↓
[채팅 /form] ← 로그인 필수 (기본 뷰: dashboard)
        ↓ 메시지 전송마다
[POST /api/chat] → GPT-4o 호출 → chat_messages 저장
        ↓ 대화 종료 버튼
[POST /api/chat/extract] → GPT 감정 추출 → emotion_entries 저장
        ↓
[대시보드 /form 내 dashboard 뷰] ← 사이드바에서 뷰 전환
```

---

## 페이지 구조

| 경로 | 역할 | 로그인 필요 |
|------|------|------------|
| `/` | 랜딩페이지 (서비스 소개 + 기술 스택) | ❌ |
| `/login` | Google 소셜 로그인 | ❌ |
| `/form` | 채팅 + 대시보드 뷰 | ✅ |

> `/result`, `/feedback`, `/dashboard` 별도 페이지 없음 — `/form` 내부 view 상태로 전환  
> 로그인 상태에서 `/` 접근 시 `/form`으로 자동 리다이렉트

---

## 인증 구조

```
Google 로그인 클릭
→ supabase.auth.signInWithOAuth({ provider: 'google', prompt: 'select_account' })
→ Google 인증 완료
→ /auth/callback?code=... 리다이렉트 (308)
→ exchangeCodeForSession(code) → Supabase 세션 생성 (response에 쿠키 직접 set)
→ public.users upsert (없으면 생성 + subscriptions free 플랜 생성, 있으면 updated_at 업데이트)
→ /form으로 이동
```

### 주요 파일

| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | 랜딩페이지 (서비스 소개 + 기술 스택, 테마 연동) |
| `src/lib/supabaseBrowser.ts` | 브라우저용 Supabase 클라이언트 (anon key) |
| `src/lib/supabaseServer.ts` | 서버용 Supabase 클라이언트 (쿠키 기반 세션) |
| `src/lib/supabaseAdmin.ts` | 관리자용 Supabase 클라이언트 (service role key) |
| `src/lib/themeCookie.ts` | 테마 쿠키 저장/읽기 유틸 |
| `src/context/ThemeContext.tsx` | 다크/라이트 테마 전역 상태 관리 |
| `src/app/auth/callback/route.ts` | OAuth 콜백 처리 + public.users + subscriptions 생성 |
| `src/app/login/page.tsx` | 로그인 페이지 UI |
| `src/components/FormClient.tsx` | 채팅 UI + 대시보드 뷰 (기본값: dashboard) |
| `src/app/api/chat/route.ts` | 채팅 API Route (GPT 대화 + chat_messages 저장) |
| `src/app/api/chat/extract/route.ts` | 대화 종료 시 감정 추출 + emotion_entries 저장 |
| `src/app/api/user/delete/route.ts` | 회원 탈퇴 (auth.users 삭제 → cascade로 전체 삭제) |
| `src/middleware.ts` | 비로그인 접근 차단 + 로그인 상태에서 /login, / 접근 시 /form 리다이렉트 |

---

## 미들웨어 보호 라우트

```
/form → 비로그인 시 /login으로 리다이렉트
/login → 로그인 상태 시 /form으로 리다이렉트
/ → 로그인 상태 시 /form으로 리다이렉트
www.lynqrateflow.com → app.lynqrateflow.com으로 영구 리다이렉트 (308)
```

---

## 테마 시스템

```
최초 방문 → 쿠키 없음 → 기본값 dark
테마 토글 → setThemeCookie() + document.documentElement.classList.toggle('dark') → 즉시 반영
페이지 로드 → layout.tsx에서 쿠키 읽기 → SSR 단계에서 테마 결정 + html className 세팅
→ 깜빡임(flash) 없음
로그아웃 시 → 테마 쿠키 유지 (로그인 후 마지막 설정 유지)
```

---

## 모바일 대응

```
레이아웃: position: fixed (top/left/right/bottom: 0) → iOS Safari 주소창 높이 이슈 해결
스크롤: overscrollBehavior: 'none' → pull-to-refresh 차단
사이드바: 데스크탑(1024px 이상)에서만 표시, 모바일은 하단 탭바로 대체
탭바: 대화 / 기록 / 대시보드 / 설정 4탭, 높이 calc(56px + safe-area-inset-bottom)
safe-area: env(safe-area-inset-top/bottom) → 노치/홈바 영역 대응
iOS 확대 방지: textarea fontSize 16px 이상 유지
```

> iOS Safari theme-color 동적 변경은 브라우저 제한으로 페이지 로드 시에만 반영됨.
> PWA 설치 시 브라우저 UI가 제거되어 문제 해소 예정.

---

## API Route

### POST /api/chat

**역할**: 대화 히스토리 누적 → GPT-4o 호출 → chat_messages 저장 → 답변 반환

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
2. 무료 플랜 월별 사용량 체크 (신규 세션 시 chat_sessions 카운트, 5회 초과 시 429 반환) ← 베타 기간 비활성화
3. sessionId 없으면 chat_sessions 신규 생성 (title: 첫 메시지 30자)
4. 유저 메시지 chat_messages 저장
5. GPT-4o 호출 (최근 10개 메시지만 전달)
6. AI 답변 chat_messages 저장
7. reply + sessionId 반환

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
2. GPT-4o 호출 (JSON 추출, temperature 0.3)
3. emotion_entries 저장 (감정은 standard_emotions 10개 중 하나로 고정)
4. chat_sessions.ended_at 업데이트

---

### DELETE /api/user/delete

**역할**: 회원 탈퇴 — auth.users 삭제 → cascade로 모든 데이터 삭제

**처리 순서**:
1. 로그인 유저 확인
2. supabaseAdmin.auth.admin.deleteUser(userId) 호출
3. cascade로 users, subscriptions, chat_sessions, chat_messages, emotion_entries 전체 삭제

---

## DB 구조

### 핵심 테이블 관계

```
auth.users (Supabase 관리)
    ↓ id 연동 (로그인 시 자동)
public.users
    ↓
subscriptions (구독 관리, user_id unique)
monthly_usage (현재 미사용 — chat_sessions 카운트로 대체)
chat_sessions (대화 세션)
    ↓
chat_messages (메시지 원문)
emotion_entries (감정 추출 데이터 — 대시보드 원천)
standard_emotions (표준 감정 분류 10개)
```

### 주요 테이블 설명

| 테이블 | 역할 |
|--------|------|
| `public.users` | 서비스 사용자 정보 |
| `subscriptions` | 구독 관리 (free/pro, active/cancelled/expired), user_id unique 제약 |
| `monthly_usage` | 현재 미사용 — 무료 플랜 사용량은 chat_sessions 카운트로 체크 |
| `chat_sessions` | 대화 세션 단위 (사이드바/기록 탭 목록) |
| `chat_messages` | 세션별 메시지 원문 (role: user/assistant) |
| `emotion_entries` | 대화 종료 시 GPT 추출 감정 데이터 (대시보드 분석 원천) |
| `standard_emotions` | 표준 감정 10개: 불안/무기력/분노/슬픔/외로움/두려움/설렘/기쁨/감사/평온 |

### 스키마 파일

```
supabase/
  schema.sql   — 현재 최신 전체 스키마
```

---

## 수익 모델

| 플랜 | 내용 |
|------|------|
| 무료 | 채팅 + 기본 피드백 월 5회 (베타 기간 무제한) |
| Pro | 대시보드 패턴 분석 + 무제한 기록 + 감정 리포트 |

- 월 4,900원 내외 구독료 검토 중
- 목표 수익: 월 100만원 (구독자 약 205명)
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
| 개발 | dev.lynqrateflow.com | dev | 개발 Supabase |
| 운영 | app.lynqrateflow.com | main | 운영 Supabase (배포 시 생성 예정) |

---

## 작업 이력

- [x] 채팅형 UI 전환 (FormClient.tsx 재설계)
- [x] 채팅 API Route (/api/chat)
- [x] 대화 종료 감정 추출 API Route (/api/chat/extract)
- [x] DB 스키마 재설계 (구독 모델 + 채팅형 반영)
- [x] DB 연결 (chat_sessions, chat_messages, emotion_entries 저장)
- [x] Google OAuth 재연동 (새 Supabase 프로젝트)
- [x] 사이드바 과거 대화 목록 실제 데이터 연동
- [x] 사용자 이름/이메일 Supabase에서 가져오기
- [x] 로그아웃 기능 구현
- [x] 대시보드 뷰 구현 (감정 타임라인 + 빈도 차트 + 이번주 vs 지난주 비교)
- [x] 월별 사용량 체크 로직 (chat_sessions 카운트 방식)
- [x] 랜딩페이지 (서비스 소개 + 기술 스택 + 테마 연동)
- [x] 시스템 프롬프트 개선 (감정 외 주제 차단, 공감 우선)
- [x] auth callback 세션 쿠키 처리 수정
- [x] sessionId 저장 누락 버그 수정
- [x] 개발 서버 배포 (dev.lynqrateflow.com)
- [x] 모바일 iOS Safari 최적화 (viewport, overscroll, safe-area, pull-to-refresh 차단)
- [x] 모바일 사이드바 fixed overlay + 백드롭
- [x] 사이드바 터치 이벤트 전파 차단 (stopPropagation)
- [x] 사이드바 스크롤 containment
- [x] 테마 토글 dark 클래스 즉시 동기화
- [x] auth callback 308 리다이렉트 (Google OAuth 히스토리 방지)
- [x] 랜딩페이지 스크린샷 섹션 + 모달 뷰어
- [x] GPT 모델 gpt-4o 업그레이드
- [x] 모바일 하단 탭바 (대화/기록/대시보드/설정, 브레이크포인트 1024px)
- [x] 대시보드 개편 (감정 캘린더, 감정별 평균 강도 카드, 감정 빈도 범례 통합)
- [x] 감정 캘린더 날짜 클릭 모달 (trigger_text + summary 표시)
- [x] 모바일 UI 버그 수정 (캘린더 셀 반응형, 탭 전환 스크롤, 채팅 패딩)
- [x] 회원 탈퇴 기능 (/api/user/delete, cascade 전체 삭제)
- [x] subscriptions 테이블 user_id unique 제약 추가
- [x] 베타 기간 사용량 제한 비활성화
- [ ] 운영 Supabase 생성 + schema.sql 실행
- [ ] 운영 배포 (app.lynqrateflow.com)
- [ ] 베타 종료 후 사용량 제한 복구
- [ ] 구독 모델 연동 (Toss Payments)
- [ ] 카카오 로그인 추가
- [ ] 레거시 코드 제거
- [ ] standard_emotions 매칭 로직 활성화
- [ ] PWA manifest.json 추가
