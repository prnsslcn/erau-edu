-- 챕터당 영상 여러 개 + 자료(PDF) 여러 개로 확장.
-- 진도는 영상 단위(video_progress), 잠금 수동해제는 챕터 단위(chapter_unlocks).

-- 챕터의 단일 영상 제약 해제 (이제 videos 테이블로 이동)
alter table chapters alter column youtube_id drop not null;

-- ─────────────────────────────────────────────
-- 영상 (챕터당 N개, 순서 있음)
-- ─────────────────────────────────────────────
create table if not exists videos (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references chapters(id) on delete cascade,
  title            text,
  youtube_id       text not null,
  duration_seconds int,
  position         int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists videos_chapter_idx on videos (chapter_id, position);

-- ─────────────────────────────────────────────
-- 강의 자료 (챕터당 N개, Supabase Storage 비공개 버킷 경로)
-- ─────────────────────────────────────────────
create table if not exists materials (
  id           uuid primary key default gen_random_uuid(),
  chapter_id   uuid not null references chapters(id) on delete cascade,
  title        text not null,
  storage_path text not null,           -- 'materials' 버킷 내 경로
  size_bytes   bigint,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists materials_chapter_idx on materials (chapter_id, position);

-- ─────────────────────────────────────────────
-- 진도 (학생 × 영상)
-- ─────────────────────────────────────────────
create table if not exists video_progress (
  student_id      uuid not null references students(id) on delete cascade,
  video_id        uuid not null references videos(id) on delete cascade,
  watched_seconds int not null default 0,
  last_position   int not null default 0,
  completed       boolean not null default false,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (student_id, video_id)
);

-- ─────────────────────────────────────────────
-- 챕터 수동 잠금 해제 (학생 × 챕터)
-- ─────────────────────────────────────────────
create table if not exists chapter_unlocks (
  student_id        uuid not null references students(id) on delete cascade,
  chapter_id        uuid not null references chapters(id) on delete cascade,
  unlocked_override boolean not null default false,
  updated_at        timestamptz not null default now(),
  primary key (student_id, chapter_id)
);

-- ─────────────────────────────────────────────
-- 기존 데이터 이관
-- ─────────────────────────────────────────────
-- 기존 챕터의 단일 영상 → videos
insert into videos (chapter_id, youtube_id, duration_seconds, position)
select c.id, c.youtube_id, c.duration_seconds, 0
from chapters c
where c.youtube_id is not null
  and not exists (select 1 from videos v where v.chapter_id = c.id);

-- 기존 progress 의 수동 해제 → chapter_unlocks
insert into chapter_unlocks (student_id, chapter_id, unlocked_override)
select p.student_id, p.chapter_id, p.unlocked_override
from progress p
where p.unlocked_override = true
on conflict (student_id, chapter_id) do nothing;

-- 참고: 기존 progress 테이블은 더 이상 사용하지 않습니다(영상 단위 video_progress로 대체).
-- 데이터 보존을 위해 즉시 삭제하지 않고 남겨둡니다.
