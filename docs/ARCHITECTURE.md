# Mind-Echo 아키텍처 문서

> 마지막 업데이트: 2026-04-19

---

## 서비스 개요

감정을 채팅으로 털어놓으면 GPT가 공감하고, 대화 종료 시 감정 데이터를 자동 추출해 대시보드에서 패턴을 시각화하는 AI 감정 대화 서비스.

- **프론트엔드**: Next.js (App Router) + TypeScript + Tailwind CSS v4
- **백엔드**: Next.js API Routes
- **DB**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (Google OAuth)
- **AI**: GPT-4.1 API
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
        ↓ 로그인 시 미완료 세션 자동 extract
[채팅 /form] ← 로그인 필수 (기본 뷰: dashboard)
        ↓ 메시지 전송마다
[POST /api/chat] → GPT-4.1 호출 → chat_messages 저장
        ↓ 새 대화 시작 / 세션 이동 / 탭 전환(visibilitychange) 시 자동 트리거
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
| `/privacy` | 개인정보처리방침 | ❌ |
| `/terms` | 이용약관 | ❌ |

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
→ 미완료 세션(last_extracted_at = null) 자동 extract
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
| `src/app/api/chat/extract/route.ts` | 자동 감정 추출 + emotion_entries 저장 |
| `src/app/api/user/delete/route.ts` | 회원 탈퇴 (auth.users 삭제 → cascade로 전체 삭제) |
| `src/app/api/checkout/route.ts` | Creem checkout URL 생성 |
| `src/app/api/webhooks/creem/route.ts` | 결제/구독 webhook 처리 |
| `src/app/api/portal/route.ts` | 고객 포털 링크 생성 |
| `src/app/api/subscription/cancel/route.ts` | 구독 취소 예약 (scheduled_cancel) |
| `src/app/api/subscription/resume/route.ts` | 구독 취소 철회 |
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
스크롤: overscrollBehavior: 'none' (div 레벨 + body 레벨) → pull-to-refresh 차단
사이드바: 데스크탑(1024px 이상)에서만 표시, 모바일은 하단 탭바로 대체
탭바: 대화 / 기록 / 대시보드 / 설정 4탭, 높이 calc(56px + safe-area-inset-bottom)
safe-area: env(safe-area-inset-top/bottom) → 노치/홈바 영역 대응
iOS 확대 방지: textarea fontSize 16px 이상 유지
헤더 새 대화 버튼: 모바일에서만 표시 (대시보드 탭 제외)
```

> iOS Safari theme-color 동적 변경은 브라우저 제한으로 페이지 로드 시에만 반영됨.
> PWA 설치 시 브라우저 UI가 제거되어 문제 해소 예정.

---

## 감정 자동 추출 구조

대화종료 버튼 없이 아래 시점에 자동으로 extract 실행:

| 트리거 | 설명 |
|--------|------|
| 새 대화 버튼 클릭 | 현재 세션에 새 메시지가 있고 유저 메시지 5개 이상일 때 |
| 다른 세션 클릭 | 현재 세션에 새 메시지가 있고 유저 메시지 5개 이상일 때 이동 전 실행 |
| visibilitychange | 브라우저 탭 전환 / 앱 전환 / 화면 잠금 시 (sendBeacon 적용 예정) |
| 첫 세션 즉시 추출 | 가입 후 첫 세션에서 유저 메시지 3개 도달 시 즉시 추출 + 토스트 (이후 추출은 5개 이상 + 탭전환/재로그인/새대화 트리거) |
| 로그인 시 | last_extracted_at=null 또는 last_extracted_at < updated_at인 미완료 세션 최대 5개 일괄 처리 |

### N:M 구조
- 하나의 세션에서 여러 번 extract 가능 (대화가 여러 날에 걸칠 때)
- `last_extracted_at` 기준으로 신규 메시지만 추출 → 데이터 중복 방지
- emotion_entries는 extract 실행 시점 날짜로 기록 → 캘린더에 정확히 반영

---

## API Route

### POST /api/chat

**역할**: 대화 히스토리 누적 → GPT-4.1 호출 → chat_messages 저장 → 답변 반환

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
2. 무료 플랜 월별 사용량 체크 (이번 달 emotion_entries 카운트, 10회 초과 시 429 반환)
3. sessionId 없으면 chat_sessions 신규 생성 (title: 첫 메시지 30자)
4. 유저 메시지 chat_messages 저장
5. chat_sessions.updated_at 갱신
6. GPT-4.1 호출 (최근 20개 메시지만 전달 + 최근 emotion_entries 5개 컨텍스트 주입)
7. AI 답변 chat_messages 저장
8. reply + sessionId 반환

---

### POST /api/chat/extract

**역할**: 자동 트리거 시 last_extracted_at 이후 신규 메시지만 추출 → emotion_entries 저장

**요청 바디**:
```json
{
  "sessionId": "uuid",
  "force": "boolean (첫 세션 즉시 추출 시 true)"
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
2. chat_sessions에서 last_extracted_at 조회
3. last_extracted_at 이후 신규 메시지만 chat_messages에서 조회
4. 신규 메시지 없거나 유저 메시지 5개 미만이면 400 반환 (force=true면 스킵)
5. GPT-4.1 호출 (JSON 추출, temperature 0.3)
6. emotion_entries 저장
7. chat_sessions.ended_at + last_extracted_at 업데이트

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
emotion_entries (감정 추출 데이터 — 대시보드 원천, 세션당 N개 가능)
standard_emotions (표준 감정 분류 10개)
```

### 주요 테이블 설명

| 테이블 | 역할 |
|--------|------|
| `public.users` | 서비스 사용자 정보 |
| `subscriptions` | 구독 관리 (free/pro, active/canceled/scheduled_cancel), canceled_at 컬럼으로 취소 시점 관리, expires_at으로 만료일 관리, user_id unique 제약, creem_customer_id로 포털 URL 생성, creem_subscription_id로 취소/철회 API 호출 |
| `monthly_usage` | 현재 미사용 — 무료 플랜 사용량은 emotion_entries 카운트로 체크 |
| `chat_sessions` | 대화 세션 단위 (사이드바/기록 탭 목록), last_extracted_at 컬럼으로 추출 시점 관리 |
| `chat_messages` | 세션별 메시지 원문 (role: user/assistant) |
| `emotion_entries` | 자동 추출 감정 데이터 (대시보드 분석 원천, 세션:엔트리 = N:M) |
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
| 무료 | 감정 기록 월 10회 (emotion_entries 추출 수 기준) |
| Pro | 대시보드 패턴 분석 + 무제한 기록 + 감정 리포트 |

- 월 $6.99 내외 구독료 검토 중
- 목표 수익: 월 100만원 (구독자 약 100명)
- 구독 전환 트리거: 대시보드에서 패턴이 보이기 시작하는 순간
- Creem (MerchantOfRecord, USD) — Live 모드 운영 중

---

## 환경변수

| 변수 | 용도 | 노출 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 브라우저 + 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 일반 권한 키 | 브라우저 + 서버 |
| `SUPABASE_URL` | Supabase URL | 서버만 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관리자 권한 키 | 서버만 |
| `OPENAI_API_KEY` | OpenAI API 키 | 서버만 |
| `CREEM_API_KEY` | Creem API 키 | 서버만 |
| `CREEM_PRODUCT_ID` | Creem 상품 ID | 서버만 |
| `NEXT_PUBLIC_APP_URL` | 앱 베이스 URL (결제 완료 후 리다이렉트용) | 브라우저 + 서버 |
| `CREEM_WEBHOOK_SECRET` | Creem 웹훅 서명 검증 키 | 서버만 |

---

## 배포 구조

| 환경 | 도메인 | 브랜치 | DB |
|------|--------|--------|-----|
| 로컬 | localhost:3000 | - | 개발 Supabase |
| 개발 | dev.lynqrateflow.com | dev | 개발 Supabase |
| 운영 | app.lynqrateflow.com | main | 운영 Supabase |

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
- [x] 시스템 프롬프트 개선 (감정 외 주제 차단, 공감 우선, 질문 최소화)
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
- [x] GPT 모델 gpt-4.1로 업그레이드
- [x] 세션 간 맥락 유지 구조 (최근 emotion_entries 5개 시스템 프롬프트 주입)
- [x] 운영 Supabase 생성 + schema.sql 실행
- [x] 모바일 하단 탭바 (대화/기록/대시보드/설정, 브레이크포인트 1024px)
- [x] 대시보드 개편 (감정 캘린더, 감정별 평균 강도 카드, 감정 빈도 차트)
- [x] 감정 캘린더 날짜 클릭 모달 (trigger_text + summary 표시)
- [x] 모바일 UI 버그 수정 (캘린더 셀 반응형, 탭 전환 스크롤, 채팅 패딩)
- [x] 회원 탈퇴 기능 (/api/user/delete, cascade 전체 삭제)
- [x] subscriptions 테이블 user_id unique 제약 추가
- [x] 베타 기간 사용량 제한 비활성화
- [x] 운영 배포 (app.lynqrateflow.com)
- [x] 대화종료 버튼 제거 → 자동 extract 구조로 전환
- [x] hasNewMessage 플래그 기반 extract 트리거 최적화
- [x] last_extracted_at 기반 신규 메시지만 추출 (N:M 구조)
- [x] chat_sessions.last_extracted_at 컬럼 추가
- [x] 로그인 시 미완료 세션 일괄 자동 extract
- [x] visibilitychange 이벤트로 탭/앱 전환 시 자동 extract
- [x] 세션 종료 후에도 대화 이어서 가능 (입력창 제한 해제)
- [x] 완료/진행중 뱃지 제거
- [x] 요약 카드 제거
- [x] 채팅 입력창 위 대시보드 요약바 추가 (오늘 감정 / 마지막 기록)
- [x] 모바일 헤더 새 대화 버튼 추가 (대시보드 탭 제외)
- [x] 기록 탭에서 동일 세션 재클릭 시 하단 즉시 이동
- [x] 감정 빈도 차트 동적 높이 적용
- [x] iOS Safari pull-to-refresh 방지 개선 (body 레벨 overscrollBehavior)
- [x] 기록 탭 콘텐츠 짧을 때 pull-to-refresh 방지 (minHeight 적용)
- [x] 감정 캘린더 → 히트맵으로 교체 (날짜별 강도/빈도 시각화, 월/주 네비게이션)
- [x] 모바일 히트맵 주 단위 표시 (일요일 기준)
- [x] 공휴일 API 연동 (holidays.hyunbin.page, 토/일/공휴일 색상 구분)
- [x] 비표준 감정 추출 스킵 로직 추가 (extract API)
- [x] 기존 비표준 감정 데이터 정리 (공허함/공허/답답 → 무기력)
- [x] 인사이트 문구 개선 (비워진다 뉘앙스, 부정/긍정 분기)
- [x] 대시보드 카드 순서 변경 (히트맵 상단)
- [x] 운영 DB 마이그레이션 (last_extracted_at 컬럼 추가)
- [x] schema.sql 변경 히스토리 주석 추가
- [x] Creem 결제 연동 (checkout + webhook + 포털)
- [x] 구독 상태 UI 표시 (무료/Pro)
- [x] 첫 세션 유저 메시지 5개 즉시 자동 추출 + 토스트 알림
- [x] extract API 최소 유저 메시지 5개 조건 추가 (force 파라미터)
- [x] 중복 visibilitychange 핸들러 제거 (이중 추출 버그 수정)
- [x] extract 호출 res.ok 패턴 적용 (불필요한 콘솔 에러 제거)
- [x] 대시보드 총기록 카드 제거 → 최근 기록 5개 카드 추가 (summary + 시간 표시)
- [x] 대시보드 이번주 vs 지난주 카드 3열 레이아웃으로 변경
- [x] 최근 기록 날짜 레이블 개선 (오늘은 시간 포함, 어제/N일 전)
- [x] 개인정보처리방침/이용약관 페이지 추가
- [x] 로그인 페이지 약관 링크 연결
- [x] 랜딩페이지 카피 전면 교체 (서비스 전용, 챗지피티 스토리 섹션 추가)
- [x] 푸터 이메일/약관 링크 추가
- [x] Creem KYC 인증 + 계좌 연결 완료 (승인 대기 중)
- [x] Pro 버튼 임시 "준비 중" 처리
- [x] 레거시 코드 제거
- [x] 무료 플랜 사용량 제한 기준 변경 (chat_sessions → emotion_entries 추출 수 월 10회)
- [x] 사용량 초과 시 Pro 유도 모달 추가 (limit_exceeded)
- [x] Creem Live 모드 승인 완료
- [x] 베타 종료 — 무료 플랜 월 10회 제한 활성화
- [x] 로그인 시 미완료 세션 감지 로직 개선 (last_extracted_at < updated_at 조건 추가)
- [x] chat API 메시지 저장 시 chat_sessions.updated_at 갱신
- [x] onAuthStateChange INITIAL_SESSION 기반으로 초기 로드 구조 변경 (401 방지)
- [x] extract 성공 시 대시보드 silent 갱신 (깜빡임 방지)
- [x] Pro 버튼 결제 버튼으로 교체 (Live 모드)
- [x] 설정 뷰 구독 섹션 추가 (모바일 구독 버튼 대응)
- [x] 인사이트 문구 조사 자동 처리 (은/는/이/가/을/를/으로/로)
- [x] 최근 기록 날짜 표기 버그 수정 (자정 기준으로 변경)
- [x] 구독 취소 후 만료일까지 Pro 유지 구조 구현 (canceled 상태 + expires_at 기준)
- [x] subscriptions 테이블 canceled_at 컬럼 추가
- [x] chat API 구독 체크 로직 수정 (canceled 상태 + expires_at 기준)
- [x] 웹훅 이벤트 분리 (subscription.active / canceled / expired)
- [x] 웹훅 페이로드 키 검증 완료 (current_period_end_date, canceled_at)
- [x] canceled 스펠링 통일 (DB/코드/웹훅)
- [x] 구독 상태별 UI 분기 (free/pro+active/pro+canceled) 세 군데 통일
- [x] 대시보드 구독 상태 카드 추가 (무료 사용량 진행바)
- [x] 이번 달 사용량 monthlyCount fetch 로직 추가 
- [x] Creem baseUrl 동적 처리 (test/live 자동 전환, includes('test') 조건)
- [x] 탈퇴 시 Creem 구독 즉시 취소 로직 추가 (creem_subscription_id 기반)
- [x] portal API creem_customer_id 기반으로 변경 (이메일 조회 제거)
- [x] subscriptions 테이블 creem_customer_id, creem_subscription_id 컬럼 추가
- [x] 웹훅 subscription.active에서 creem_customer_id, creem_subscription_id 저장
- [x] 탭 전환 및 대시보드 진입 시 전체 상태 동기화 (fetchSubscription, fetchMonthlyCount, fetchDashboardData)
- [x] 채팅 오류 메시지 개선 (새로고침 안내 추가)
- [x] fetchMonthlyCount getUser 제거 (RLS 기반으로 단순화)
- [x] 구독 취소 예약(scheduled_cancel) 및 취소 철회(resume) 기능 구현
- [x] 웹훅 서명 검증 추가
- [x] 결제 체크아웃 이메일 prefill 추가
- [x] subscriptions.status scheduled_cancel 추가 (DB constraint)
- [x] 웹훅 started_at 덮어쓰기 제거
- [x] scheduled_cancel 상태 Pro 채팅 접근 허용
- [x] fetchSubscription 만료일 비교 방어 로직 scheduled_cancel 포함
- [x] 웹훅 중복 처리 방어 코드 추가 (canceled + 만료일 체크)
- [x] 사이드바 팝업 active 상태 포털 버튼 → 설정 탭으로 변경
- [x] 구독 취소 버튼 화살표 제거
- [x] 웹훅 subscription.paid 핸들러 추가 (갱신 결제 성공 시 expires_at 업데이트)
- [x] 탈퇴 시 scheduled_cancel 상태 구독도 즉시 취소 처리
- [x] refreshAll로 데이터 갱신 로직 통일 (dashboard/records/settings/visibilitychange/extract)
- [x] pagehide 핸들러 제거 (visibilitychange와 중복 추출 버그 수정)
- [x] 기록/설정 탭 진입 시 데이터 갱신 추가
- [x] 운영 배포 (테스트 모드 결제 키로)
- [x] refund.created 웹훅 처리 추가 (환불 시 Creem 구독 즉시 취소 + DB free 초기화)
- [x] 환불 시 subscription.canceled 덮어쓰기 방지 (plan: free 체크 가드 추가)
- [x] 환불 정책 약관 수정 (3일 이내 미이용 시로 변경)
- [x] Creem Live 키 교체 (운영 배포 전 필요)
- [x] 채팅 프롬프트 개선 (마무리형 문장 줄이기 → 대화 이어지는 여운 유도)
- [x] 랜딩페이지 카피 수정 (히어로 카피 변경, 스토리 섹션 제거)
- [x] 첫 세션 최초 추출 조건 5턴 → 3턴으로 완화
- [x] 운영 배포 (Live 키 교체 완료, 실결제 테스트 완료)
- [x] 빈 대시보드 UX 개선 — 시작하기 버튼 제거, 전체 레이아웃 그대로 표시
- [x] standard_emotions soft_order 기준 정렬 + standardEmotions state 관리
- [x] 대시보드 히트맵/빈도/평균강도 y축에 표준 감정 10개 항상 표시
- [x] 기록 없을 때 감정 빈도/평균 강도 카드 빈 상태 텍스트 표시
- [x] 이번 주 vs 지난 주 카드 데이터 없어도 항상 표시
- [x] 감정 빈도 데이터 없을 때 ResponsiveContainer 빈 공간 제거
- [x] 채팅 첫 AI 메시지 아이스브레이킹 문구 개선
- [x] 인사이트 카드 빈 상태 설명 문구 개선 (자동 기록/패턴 안내)
- [x] 인사이트 카드 라벨 "이번 달 요약" → "감정 인사이트"로 수정
- [x] 구독 카드 진행바 안내 문구 추가 (쌓일수록 패턴이 선명해져요)
- [x] INITIAL_AI_MESSAGE 상수 추출 및 중복 주석 제거
- [x] 모바일→데스크탑 전환 시 records 뷰 chat으로 자동 전환 버그 수정
- [x] Microsoft Clarity analytics 세팅
- [x] 랜딩 히어로 서비스 스크린샷 3개 추가 (채팅/대시보드/히트맵)
- [x] CTA 버튼 하단 프라이버시 문구 추가
- [x] 로그인 페이지 로고 클릭 시 랜딩으로 이동
- [x] 웹훅 subscription.canceled 처리 로직 수정 (scheduled_cancel 만료 시 free/active로 초기화)
- [ ] 모든 기기 일괄 로그아웃 기능 (설정 탭, signOut scope: global)
- [ ] iOS Safari 탭/앱 전환 추출 개선 (sendBeacon 적용 예정)
- [ ] 카카오 로그인 추가
- [ ] PWA manifest.json 추가
- [ ] OG 이미지 추가 (카카오톡 링크 썸네일)
