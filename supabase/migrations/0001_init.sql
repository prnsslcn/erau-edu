-- ERAU 입학 전 교육 LMS — 초기 스키마
-- Supabase SQL Editor 또는 CLI로 실행하세요.

-- 확장: gen_random_uuid()
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 학생 (전화번호 + 4자리 PW 로그인)
-- ─────────────────────────────────────────────
create table if not exists students (
  id            uuid primary key default gen_random_uuid(),
  phone         text unique not null,          -- 로그인 ID, 숫자만 (예: 01012345678)
  password_hash text not null,                 -- 4자리 PW의 bcrypt 해시
  name          text not null,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 교수진 (이메일 + 강력한 PW 로그인)
-- ─────────────────────────────────────────────
create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 강의 챕터 (YouTube 영상 + 강의자료 링크)
-- ─────────────────────────────────────────────
create table if not exists chapters (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  youtube_id       text not null,              -- YouTube 영상 ID (URL 아님)
  material_url     text,                       -- 강의자료 링크 (선택)
  duration_seconds int,                        -- 영상 길이(초), 알려지면 저장
  position         int not null,               -- 표시/잠금 순서 (작을수록 먼저)
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists chapters_position_idx on chapters (position);

-- ─────────────────────────────────────────────
-- 진도 (학생 × 챕터 1행)
-- ─────────────────────────────────────────────
create table if not exists progress (
  student_id      uuid not null references students(id) on delete cascade,
  chapter_id      uuid not null references chapters(id) on delete cascade,
  watched_seconds int not null default 0,      -- 실제 시청한 누적 초(고점 유지)
  last_position   int not null default 0,      -- 이어보기 지점(초)
  completed       boolean not null default false,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (student_id, chapter_id)
);

-- ─────────────────────────────────────────────
-- 로그인 시도 기록 (무차별 대입 방지 — 횟수 제한)
-- ─────────────────────────────────────────────
create table if not exists login_attempts (
  id           bigint generated always as identity primary key,
  identifier   text not null,                  -- 전화번호 / 이메일 / IP
  kind         text not null,                  -- 'student' | 'admin'
  ip           text,
  success      boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists login_attempts_lookup_idx
  on login_attempts (identifier, attempted_at);
create index if not exists login_attempts_ip_idx
  on login_attempts (ip, attempted_at);

-- 참고: 모든 DB 접근은 서버(서비스 롤 키)에서만 이뤄지므로
-- RLS는 사용하지 않습니다. anon 키는 클라이언트에 노출하지 않습니다.
