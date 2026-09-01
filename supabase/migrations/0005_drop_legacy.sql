-- 레거시 정리: 0003에서 videos/materials/video_progress/chapter_unlocks 로 이관을 마친 뒤
-- 데이터 보존을 위해 남겨뒀던 구 스키마를 제거합니다.
--
-- 제거 대상 (2026-09-02 운영 DB 확인 결과 모두 비어 있음):
--   - progress 테이블            → video_progress + chapter_unlocks 로 대체 (0행)
--   - chapters.youtube_id        → videos.youtube_id 로 대체 (8행 전부 NULL)
--   - chapters.duration_seconds  → videos.duration_seconds 로 대체 (8행 전부 NULL)
--   - chapters.material_url      → materials 테이블로 대체 (8행 전부 NULL)
-- 코드에서 이들을 참조하는 곳은 없습니다.

-- ── 안전장치: progress 에 데이터가 남아 있으면 중단 ──
do $$
begin
  if to_regclass('public.progress') is not null
     and exists (select 1 from progress limit 1) then
    raise exception
      'progress 테이블에 데이터가 남아 있습니다. video_progress 이관 여부를 확인한 뒤 다시 실행하세요.';
  end if;
end $$;

drop table if exists progress;

-- ── chapters 레거시 컬럼 제거 ──
-- 값이 모두 NULL 인지 먼저 확인
do $$
begin
  if exists (
    select 1 from chapters
    where youtube_id is not null
       or duration_seconds is not null
       or material_url is not null
  ) then
    raise exception
      'chapters 레거시 컬럼에 값이 남아 있습니다. videos/materials 이관 여부를 확인한 뒤 다시 실행하세요.';
  end if;
end $$;

alter table chapters
  drop column if exists youtube_id,
  drop column if exists duration_seconds,
  drop column if exists material_url;
