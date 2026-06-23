# ERAU 입학 전 교육 LMS

## 프로젝트 개요
Embry-Riddle Aeronautical University(ERAU) 진학을 준비하는 **소속 학생** 대상의 입학 전 온라인 교육 사이트.
단순 정보 페이지가 아니라, 학생이 YouTube 강의 영상을 시청하고 **진도율에 따라 다음 챕터가 순차적으로 열리는** 학습 관리(LMS) 사이트.

- 대상 규모: 연 100명 이하의 폐쇄형 소수 교육
- 영상: YouTube(미등록/Unlisted)에 업로드된 영상을 IFrame Player API로 임베드해 진도 추적
- 교수진(Admin)은 강의 등록과 학생 진도 확인을 대시보드에서 수행

## 기술 스택
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (PostCSS)
- **Supabase (Postgres)** — DB. 서버에서 **service_role 키**로만 접근(RLS 미사용)
- 인증: **커스텀** — `jose`(JWT 쿠키 세션) + `bcryptjs`(비밀번호 해시)
- 검증: `zod`
- 폰트: **Pretendard**(CDN @font-face)
- 패키지 매니저: **pnpm** / Node 20+
- 배포 예정: Vercel

## 명령어
```bash
pnpm dev      # 개발 서버 (사용자가 직접 실행 — 아래 '협업 규칙' 참고)
pnpm build    # 프로덕션 빌드 (검증용으로 사용)
pnpm start    # 프로덕션 서버
pnpm lint     # ESLint

# 첫/추가 Admin(교수) 계정 생성
node --env-file=.env.local scripts/seed-admin.mjs <email> <password> "<이름>"
```

## 협업 규칙 (중요)
- **git 커밋/PR에 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.**
- **`pnpm dev`는 사용자가 직접 실행한다.** Claude가 백그라운드로 dev 서버를 띄우면 포트 3000 충돌이 난다. 검증이 필요하면 `pnpm build` / `tsc --noEmit` / curl 로 확인하고, 실행 중 서버가 필요하면 사용자에게 요청한다.
- DB/스키마 검증 시 `head:true` 카운트 쿼리는 존재하지 않는 테이블에도 에러를 안 내므로 신뢰하지 말 것 → 실제 `select`/`insert`로 확인한다.

## 아키텍처

### 인증 / 세션
- **학생**: 전화번호(ID) + 4자리 PW. 간편 가입(카톡 공유). `students` 테이블.
- **교수진(Admin)**: 이메일 + 강력한 PW. 관리자가 시드로 발급. `admins` 테이블.
- 세션: 서명된 JWT를 `erau_session` httpOnly 쿠키에 저장(30일). `{ sub, role, name }`.
  - `src/lib/auth/session.ts` — `createSession` / `getSession` / `destroySession` / `requireRole`
- **로그인 횟수 제한**: DB 기반(`login_attempts`). 식별자 15분 내 5회 실패 / IP 20회 실패 시 429.
  - `src/lib/auth/rate-limit.ts`
- 라우트 보호는 **레이아웃/페이지의 서버 컴포넌트에서 `getSession()` 후 `redirect()`** 로 처리(미들웨어 미사용).

### 진도 추적 (핵심)
- 플레이어: `src/components/YouTubePlayer.tsx` — YouTube IFrame Player API.
  - 500ms마다 재생 중일 때 `floor(currentTime)`를 `Set`에 누적(실제 본 초만 집계 → 건너뛰기는 진도 미인정).
  - 5초마다 `/api/progress`로 `{ chapter_id, watched_seconds(=Set 크기), last_position, duration }` 전송.
  - 이어보기: `start = last_position - 2`.
- 서버: `src/app/api/progress/route.ts`
  - 학생 세션 필수, **잠긴 챕터에는 기록 거부(403)**.
  - `watched_seconds`는 고점 유지(`max`), `watched_seconds/duration >= 0.9`면 `completed=true`.
  - 챕터 `duration_seconds`가 비어 있으면 최초 보고값으로 채움(대시보드 진도율 계산용).

### 순차 잠금 로직
- `src/lib/db/learn.ts` — `getStudentChapters(studentId)`:
  공개(is_published) 챕터를 순서대로 보며 **이전 챕터 완료 시 다음 챕터 unlocked**. 첫 챕터는 항상 열림.
- 잠금 판정은 서버에서만(클라이언트 우회 불가).

## 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx                     # 루트(한국어, Pretendard)
│   ├── page.tsx                       # 랜딩 + 역할별 리다이렉트
│   ├── globals.css                    # Tailwind v4 + 테마(--brand)
│   ├── (auth)/                        # 학생 로그인/가입 (로그인 시 리다이렉트)
│   │   ├── login/  signup/
│   ├── learn/                         # 학생 영역(레이아웃에서 student 강제)
│   │   ├── page.tsx                   # 강의 목록(잠금 표시)
│   │   └── [chapterId]/page.tsx       # 영상 플레이어
│   ├── admin/
│   │   ├── login/page.tsx             # Admin 로그인(공개)
│   │   └── (dash)/                    # 보호 영역(레이아웃에서 admin 강제)
│   │       ├── page.tsx               # 진도 대시보드
│   │       ├── students/[id]/page.tsx # 학생 상세
│   │       └── chapters/
│   │           ├── page.tsx           # 강의 관리
│   │           └── actions.ts         # 챕터 CRUD 서버 액션
│   └── api/auth/{student,admin}/...   # 로그인/가입/로그아웃, /api/progress
├── components/
│   ├── AuthForm.tsx                   # 로그인/가입 공용 폼(client)
│   ├── LogoutButton.tsx
│   ├── YouTubePlayer.tsx              # 진도 추적 플레이어(client)
│   └── admin/ChapterManager.tsx       # 강의 CRUD UI(client)
└── lib/
    ├── supabase.ts                    # service_role 서버 클라이언트(server-only)
    ├── validation.ts                  # zod 스키마
    ├── youtube.ts                     # YouTube 링크/ID → 11자리 ID 추출
    ├── auth/{session,password,rate-limit,request}.ts
    └── db/{types,learn,progress}.ts
supabase/migrations/0001_init.sql      # 전체 스키마
scripts/seed-admin.mjs                 # Admin 계정 시드
```

## DB 스키마 (`supabase/migrations/0001_init.sql`)
- `students(id, phone unique, password_hash, name, created_at)`
- `admins(id, email unique, password_hash, name, created_at)`
- `chapters(id, title, description, youtube_id, material_url, duration_seconds, position, is_published, ...)`
- `progress(student_id, chapter_id, watched_seconds, last_position, completed, completed_at, updated_at)` — PK `(student_id, chapter_id)`
- `login_attempts(id, identifier, kind, ip, success, attempted_at)`

스키마 변경 시: SQL 파일을 새 마이그레이션으로 추가하고 Supabase SQL Editor에서 실행한다.
모든 DB 접근은 서버에서 service_role 키로만 → **RLS 미사용, anon 키는 클라이언트에 노출 금지.**

## 환경변수 (`.env.local`, git 미추적)
```
NEXT_PUBLIC_SUPABASE_URL=...          # Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=...         # service_role 키 (서버 전용, 절대 노출 금지)
SESSION_SECRET=...                    # 세션 JWT 서명 (64 hex)
```
`.env.example` 참고. `src/lib/supabase.ts`는 `server-only`로 클라이언트 번들 유입을 차단한다.

## 디자인 톤
- 밝고 깔끔한 교육용 톤(라이트). 브랜드 색 `--brand`(ERAU 블루 `#0a4d8c`).
- 한국어: `word-break: keep-all`, 자연스러운 합니다체.

## 알려진 한계 / 향후 작업
- **진도 부정 방지**: 현재 MVP는 클라이언트가 보고한 `watched_seconds`를 신뢰. 작정한 우회(직접 API 호출) 가능. 필요 시 서버 측 구간 검증 강화.
- **영상 유출**: YouTube 미등록 영상은 링크만 알면 사이트 밖에서도 시청 가능. 보호가 중요해지면 Vimeo(도메인 제한)/Cloudflare Stream 등으로 전환 검토.
- 인증 보안: 전화번호+4자리 PW는 폐쇄형 소수 그룹 전제. 횟수 제한으로 1차 방어.
- TODO: Vercel 배포, 모바일 반응형 QA, SEO/메타데이터, 접근성, 디자인 다듬기.
```
