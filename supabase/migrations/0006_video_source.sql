-- 영상 종류 구분: 기존 YouTube 클립 + 교수가 직접 업로드한 영상(Bunny Stream)
--
-- 기존 videos 55행은 전부 YouTube이므로 source 기본값 'youtube' 로 그대로 유효하다.
-- 진도(video_progress)는 video_id 기준이라 이 변경의 영향을 받지 않는다.

alter table videos
  add column if not exists source   text not null default 'youtube',
  add column if not exists asset_id text;

-- 직접 업로드 영상은 youtube_id 가 없다
alter table videos alter column youtube_id drop not null;

comment on column videos.source   is '''youtube'' | ''bunny''';
comment on column videos.asset_id is 'Bunny Stream video GUID (source=''bunny'' 일 때)';

-- 무결성: 종류별로 필요한 식별자가 반드시 있어야 한다
alter table videos drop constraint if exists videos_source_identifier_check;
alter table videos add constraint videos_source_identifier_check check (
  (source = 'youtube' and youtube_id is not null)
  or
  (source = 'bunny'   and asset_id   is not null)
);

create index if not exists videos_source_idx on videos (source);
