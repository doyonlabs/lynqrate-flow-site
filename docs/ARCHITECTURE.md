# Mind-Echo 아키텍처 문서

> 마지막 업데이트: 2026-05-02
> 작업 이력은 주요 기능/구조 변경만 기록. UI·디자인·텍스트 변경은 git 커밋 메시지로 관리.

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
| `src/app/api/chat/messages/route.ts` | 과거 세션 메시지 조회 + 복호화 |
| `src/app/api/sessions/route.ts` | 세션 목록 조회 + 타이틀 복호화 |
| `src/app/api/dashboard/route.ts` | 대시보드 데이터 조회 + 복호화 |
| `src/app/api/today/route.ts` | 오늘 감정 데이터 조회 + 복호화 |
| `src/app/api/init/route.ts` | 초기 로드 데이터 통합 조회 (sessions, emotions, dashboardEntries, userInfo, subscription, monthlyCount, isFirstSession, incompleteSessions, thisWeekEntries, lastWeekEntries, recentEntries) |
| `src/app/api/entry/route.ts` | 히트맵 셀 클릭 시 trigger_text/summary 단건 조회 + 복호화 |
| `src/middleware.ts` | 비로그인 접근 차단 + 로그인 상태에서 /login, / 접근 시 /form 리다이렉트 |
| `src/lib/crypto.ts` | AES-256-GCM 암호화/복호화 유틸 (encrypt, safeDecrypt) |

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
감정 담기 버튼: 데스크탑 헤더 우측 / 모바일 헤더 새 대화 버튼 좌측 — messagesSinceExtract >= 5 조건 충족 시 노출
```

> iOS Safari theme-color 동적 변경은 브라우저 제한으로 페이지 로드 시에만 반영됨.
> PWA 설치 시 브라우저 UI가 제거되어 문제 해소 예정.

---

## 감정 자동 추출 구조

대화종료 버튼 없이 아래 시점에 자동으로 extract 실행:

| 트리거 | 설명 |
|--------|------|
| 감정 담기 버튼 클릭 | 헤더에 노출되는 메인 추출 트리거. 세션 내 유저 메시지 5개 이상 누적 시 버튼 노출 (messagesSinceExtract 기준) |
| 새 대화 버튼 클릭 | 현재 세션에 새 메시지가 있고 유저 메시지 5개 이상일 때 |
| 다른 세션 클릭 | 현재 세션에 새 메시지가 있고 유저 메시지 5개 이상일 때 이동 전 실행 |
| visibilitychange | 브라우저 탭 전환 / 앱 전환 / 화면 잠금 시 (keepalive: true 적용, sendBeacon 추가 예정) |
| 첫 세션 즉시 추출 | 가입 후 첫 세션에서 유저 메시지 3개 도달 시 즉시 추출 + 토스트 (이후 추출은 5개 이상 + 탭전환/재로그인/새대화/감정담기 트리거) |
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
| `ENCRYPTION_KEY` | AES-256-GCM 암호화 키 (32바이트 hex) | 서버만 |

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
- [x] 로그아웃 기능 구현
- [x] 대시보드 뷰 구현 (감정 빈도 차트 + 이번주 vs 지난주 비교)
- [x] 랜딩페이지 구현 (서비스 소개 + 기술 스택 + 테마 연동)
- [x] 개발 서버 배포 (dev.lynqrateflow.com)
- [x] 모바일 iOS Safari 최적화 (viewport, overscroll, safe-area, pull-to-refresh 차단)
- [x] 모바일 사이드바 fixed overlay
- [x] GPT 모델 gpt-4.1로 업그레이드
- [x] 세션 간 맥락 유지 구조 (최근 emotion_entries 5개 시스템 프롬프트 주입)
- [x] 운영 Supabase 생성 + schema.sql 실행
- [x] 모바일 하단 탭바 (대화/기록/대시보드/설정, 브레이크포인트 1024px)
- [x] 대시보드 히트맵 구현 (날짜별 강도/빈도 시각화, 월/주 네비게이션, 공휴일 연동)
- [x] 회원 탈퇴 기능 (/api/user/delete, cascade 전체 삭제)
- [x] subscriptions 테이블 user_id unique 제약 추가
- [x] 운영 배포 (app.lynqrateflow.com)
- [x] 대화종료 버튼 제거 → 자동 extract 구조로 전환
- [x] last_extracted_at 기반 신규 메시지만 추출 (N:M 구조)
- [x] chat_sessions.last_extracted_at 컬럼 추가
- [x] 로그인 시 미완료 세션 일괄 자동 extract
- [x] visibilitychange 이벤트로 탭/앱 전환 시 자동 extract (keepalive: true)
- [x] 채팅 입력창 위 대시보드 요약바 추가 (오늘 감정 / 마지막 기록)
- [x] 비표준 감정 추출 스킵 로직 추가 (extract API)
- [x] Creem 결제 연동 (checkout + webhook + 포털)
- [x] 구독 상태 UI 표시 (무료/Pro)
- [x] 첫 세션 유저 메시지 3개 즉시 자동 추출 + 토스트
- [x] extract API 최소 유저 메시지 5개 조건 추가 (force 파라미터)
- [x] 대시보드 총기록 카드 제거 → 최근 기록 5개 카드 추가
- [x] 개인정보처리방침/이용약관 페이지 추가
- [x] 무료 플랜 사용량 제한 기준 변경 (emotion_entries 추출 수 월 10회)
- [x] 사용량 초과 시 Pro 유도 모달 추가
- [x] 구독 취소 후 만료일까지 Pro 유지 구조 (canceled 상태 + expires_at 기준)
- [x] subscriptions 테이블 canceled_at 컬럼 추가
- [x] 웹훅 이벤트 분리 (subscription.active / canceled / expired / paid)
- [x] 구독 취소 예약(scheduled_cancel) 및 취소 철회(resume) 기능 구현
- [x] subscriptions.status scheduled_cancel 추가 (DB constraint)
- [x] subscriptions 테이블 creem_customer_id, creem_subscription_id 컬럼 추가
- [x] 웹훅 subscription.paid 핸들러 추가 (갱신 결제 성공 시 expires_at 업데이트)
- [x] 탈퇴 시 Creem 구독 즉시 취소 로직 추가 (creem_subscription_id 기반)
- [x] portal API creem_customer_id 기반으로 변경
- [x] refund.created 웹훅 처리 추가 (환불 시 Creem 구독 즉시 취소 + DB free 초기화)
- [x] 감정 담기 버튼 추가 (헤더, 5턴 이상 시 노출)
- [x] 온보딩 모달 추가 (첫 방문 1회 노출)
- [x] 모바일 키보드 노출 시 탭바 숨김
- [x] 구독 취소 UX 개선 (설정 페이지에서만 취소 가능)
- [x] 웹훅 subscription.expired 핸들러 → 로깅으로 교체
- [x] 웹훅 서명 검증 추가
- [x] Microsoft Clarity 민감 정보 마스킹
- [x] AES-256-GCM 암호화 적용 (chat_messages.content, emotion_entries.trigger_text/summary, chat_sessions.title)
- [x] 데이터 조회 전면 서버 이전 (클라이언트 직접 조회 → 서버 복호화 후 반환)
- [x] /api/init 대규모 개편 (userInfo/subscription/monthlyCount/isFirstSession/incompleteSessions/thisWeekEntries/lastWeekEntries/recentEntries/dashboardEntries 통합)
- [x] /api/dashboard 개편 (start/end 파라미터 기반 기간별 조회 + KST 타임존 적용)
- [x] /api/entry 신규 추가 (히트맵 셀 클릭 시 trigger_text/summary 단건 복호화)
- [x] isMobileRef 추가 (fetchDashboardData stale closure 수정)
- [x] visibilitychange 새로고침 중복 추출 방지 (sessionStorage 기반)
- [x] 채팅 시스템 프롬프트 개선 (감정 너머 통찰 유도)
- [x] 대시보드 이번주/지난주 카드 현재 기준 고정 (히트맵 기간 이동과 무관)
- [x] 히트맵 기간별 인사이트/빈도/강도 카드 연동
- [x] /api/init 주간/월경계 모바일 데이터 누락 수정
- [ ] 대화 내용 개별 삭제 기능
- [ ] 모든 기기 일괄 로그아웃 기능
- [ ] iOS Safari 탭/앱 전환 추출 개선 (sendBeacon)
- [ ] 카카오 로그인 추가
- [ ] PWA manifest.json 추가
- [ ] OG 이미지 추가
