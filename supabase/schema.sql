-- ============================================================
-- Mind-Echo 스키마 v2
-- 새 Supabase 프로젝트 SQL Editor에서 전체 실행
-- ============================================================


-- ── 1. users ──────────────────────────────────────────────────

create table public.users (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

alter table public.users enable row level security;

create policy "본인만 조회" on public.users
  for select using (auth.uid() = id);

create policy "본인만 수정" on public.users
  for update using (auth.uid() = id);


-- ── 2. subscriptions ──────────────────────────────────────────

create table public.subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  plan       text        not null default 'free' check (plan in ('free', 'pro')),
  status     text        not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_id_key unique (user_id)
);

alter table public.subscriptions enable row level security;

create policy "본인만 조회" on public.subscriptions
  for select using (auth.uid() = user_id);


-- ── 3. monthly_usage ──────────────────────────────────────────
-- 무료 플랜 월 5회 제한 추적
-- year_month 형식: '2026-03'

create table public.monthly_usage (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    not null references public.users(id) on delete cascade,
  year_month text    not null,
  count      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year_month)
);

alter table public.monthly_usage enable row level security;

create policy "본인만 조회" on public.monthly_usage
  for select using (auth.uid() = user_id);


-- ── 4. chat_sessions ──────────────────────────────────────────
-- 사이드바 대화 목록 단위

create table public.chat_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  title      text,                    -- 첫 메시지 기반으로 자동 생성 (nullable)
  started_at timestamptz not null default now(),
  ended_at   timestamptz,             -- 대화 종료 버튼 누를 때 업데이트
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;

create policy "본인만 조회" on public.chat_sessions
  for select using (auth.uid() = user_id);

create policy "본인만 삽입" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

create policy "본인만 수정" on public.chat_sessions
  for update using (auth.uid() = user_id);

create index idx_chat_sessions_user_date
  on public.chat_sessions (user_id, created_at desc);


-- ── 5. chat_messages ──────────────────────────────────────────
-- 각 세션의 메시지 원문 저장
-- role: 'user' | 'assistant'

create table public.chat_messages (
  id              uuid        primary key default gen_random_uuid(),
  chat_session_id uuid        not null references public.chat_sessions(id) on delete cascade,
  user_id         uuid        not null references public.users(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  created_at      timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "본인만 조회" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "본인만 삽입" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create index idx_chat_messages_session
  on public.chat_messages (chat_session_id, created_at asc);


-- ── 6. emotion_entries ────────────────────────────────────────
-- 대화 종료 후 GPT가 추출한 감정 데이터 → 대시보드 분석 원천

create table public.emotion_entries (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  chat_session_id uuid        references public.chat_sessions(id) on delete set null,
  raw_emotion     text        not null,
  intensity       integer     not null check (intensity between 1 and 5),
  trigger_text    text,
  summary         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.emotion_entries enable row level security;

create policy "본인만 조회" on public.emotion_entries
  for select using (auth.uid() = user_id);

create policy "본인만 삽입" on public.emotion_entries
  for insert with check (auth.uid() = user_id);

create index idx_emotion_entries_user_date
  on public.emotion_entries (user_id, created_at desc);


-- ── 7. standard_emotions ──────────────────────────────────────
-- 향후 raw_emotion 매칭 로직 활성화 예정

create table public.standard_emotions (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  description text,
  color_code  text    not null,
  soft_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.standard_emotions enable row level security;

create policy "누구나 조회 가능" on public.standard_emotions
  for select using (true);

insert into public.standard_emotions (name, color_code, soft_order) values
  ('불안',   '#a78bfa', 1),
  ('무기력', '#60a5fa', 2),
  ('분노',   '#f87171', 3),
  ('슬픔',   '#93c5fd', 4),
  ('외로움', '#c4b5fd', 5),
  ('두려움', '#fca5a5', 6),
  ('설렘',   '#fde68a', 7),
  ('기쁨',   '#6ee7b7', 8),
  ('감사',   '#86efac', 9),
  ('평온',   '#bfdbfe', 10);
