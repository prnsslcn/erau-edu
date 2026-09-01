-- 학생 가입을 "관리자 승인제"로 전환
-- 가입 시 approved=false(대기), 관리자가 승인하면 true → 로그인 허용

alter table students
  add column if not exists approved boolean not null default false,
  add column if not exists approved_at timestamptz;

-- 기존 학생은 승인된 것으로 처리(grandfather)
update students set approved = true, approved_at = now() where approved = false;

-- 승인 대기/목록 조회용 인덱스
create index if not exists students_approved_idx on students (approved, created_at desc);
