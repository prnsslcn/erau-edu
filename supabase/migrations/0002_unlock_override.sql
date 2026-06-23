-- 교수진이 특정 학생의 특정 강의 잠금을 수동으로 해제할 수 있도록
-- progress 테이블에 unlocked_override 플래그 추가.
-- true면 이전 강의 완료 여부와 무관하게 해당 강의가 열림.

alter table progress
  add column if not exists unlocked_override boolean not null default false;
