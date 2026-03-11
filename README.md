# Mind-Echo

> AI 감정 대화 서비스 — 털어놓는 것만으로 패턴이 보입니다

채팅으로 감정을 털어놓으면 GPT가 공감하고, 대화 종료 시 감정 데이터를 자동 추출해 대시보드에서 패턴을 시각화하는 서비스입니다.

🔗 [dev.lynqrateflow.com](https://dev.lynqrateflow.com)

---

## 주요 기능

- **채팅형 감정 대화** — GPT-4o 기반, 한국 정서에 특화된 AI 감정 코치
- **자동 감정 추출** — 대화 종료 시 감정 / 강도 / 트리거 자동 추출 후 DB 저장
- **감정 패턴 대시보드** — 타임라인, 빈도 차트, 주간 비교 시각화
- **세션 간 맥락 유지** — 과거 감정 기록을 시스템 프롬프트에 주입해 연속성 확보
- **Google 소셜 로그인** — 별도 회원가입 없이 바로 시작

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| DB | Supabase (PostgreSQL, RLS) |
| Auth | Supabase Auth (Google OAuth) |
| AI | GPT-4o API |
| 배포 | Vercel |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩페이지
│   ├── login/                # 로그인 페이지
│   ├── form/                 # 채팅 + 대시보드 (메인 앱)
│   ├── auth/callback/        # OAuth 콜백 처리
│   └── api/
│       ├── chat/             # 채팅 API (GPT 대화 + DB 저장)
│       └── chat/extract/     # 감정 추출 API
├── components/
│   └── FormClient.tsx        # 채팅 UI + 대시보드 뷰
├── context/
│   └── ThemeContext.tsx      # 다크/라이트 테마
└── lib/
    ├── supabaseBrowser.ts
    ├── supabaseServer.ts
    └── supabaseAdmin.ts
```

---

## DB 스키마

`supabase/schema.sql` 참고. 주요 테이블:

- `users` / `subscriptions` — 사용자 및 구독 관리
- `chat_sessions` / `chat_messages` — 대화 세션 및 메시지 저장
- `emotion_entries` — GPT 추출 감정 데이터 (대시보드 원천)
- `standard_emotions` — 표준 감정 10종 (불안/무기력/분노/슬픔/외로움/두려움/설렘/기쁨/감사/평온)

---

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

---

## 배포

Vercel CI/CD — GitHub 연동 자동 배포  
개발 서버: [dev.lynqrateflow.com](https://dev.lynqrateflow.com)
