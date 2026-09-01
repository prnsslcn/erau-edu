# ERAU 입학 전 교육 LMS

## 프로젝트 개요
Embry-Riddle Aeronautical University(ERAU) 진학을 준비하는 **소속 학생** 대상의 입학 전 온라인 교육 사이트.
단순 정보 페이지가 아니라, 학생이 YouTube 강의 영상을 시청하고 **진도율에 따라 다음 강의가 순차적으로 열리는** 학습 관리(LMS) 사이트.

- **운영 중** — `https://www.eraukorea.com` (Vercel, 서울 리전)
- 대상 규모: 연 100명 이하의 폐쇄형 소수 교육. 검색엔진 색인 차단.
- 영상: YouTube(미등록/Unlisted)에 업로드된 영상을 IFrame Player API로 임베드해 진도 추적
- 자료: PDF를 Supabase Storage 비공개 버킷에 저장, 서명 URL로만 다운로드
- 교수진(Admin)은 강의 등록·가입 승인·학생 진도 확인을 대시보드에서 수행

> 운영 스냅샷 (2026-09-02): 학생 15명(활성 12·가입대기 3), 챕터 8개 / 클립 55개 / PDF 자료 21개.
> 콘텐츠는 ERAU AS 121 Lesson 03~32 기반 (`scripts/seed-content.mjs`).

## 기술 스택
- **Next.js 16.2.9** (App Router) + **React 19.2.4** + **TypeScript**
- **Tailwind CSS v4** (PostCSS)
- **Supabase (Postgres + Storage)** — 서버에서 **service_role 키**로만 접근(RLS 미사용)
- 인증: **커스텀** — `jose`(JWT 쿠키 세션) + `bcryptjs`(비밀번호 해시, cost 8)
- 검증: `zod` v4 / 아이콘: `lucide-react`
- 폰트: **Outfit**(`next/font/google`, 영문·숫자) + **Pretendard**(CDN @font-face, 한글) — 글자 단위 폴백
- 패키지 매니저: **pnpm** / Node 20+
- 배포: **Vercel** (`vercel.json` → `regions: ["icn1"]`, Supabase 서울과 colocate)

## 명령어
```bash
pnpm dev      # 개발 서버 (사용자가 직접 실행 — 아래 '협업 규칙' 참고)
pnpm build    # 프로덕션 빌드 (검증용으로 사용)
pnpm start    # 프로덕션 서버
pnpm lint     # ESLint

# 첫/추가 Admin(교수) 계정 생성
node --env-file=.env.local scripts/seed-admin.mjs <email> <password> "<이름>"

# 강의 콘텐츠 전체 재시드 (⚠️ 기존 챕터·클립·자료·진도를 모두 지우고 새로 채움)
node --env-file=.env.local scripts/seed-content.mjs
```

## 협업 규칙 (중요)
- **git 커밋/PR에 `Co-Authored-By: Claude` 트레일러를 넣지 않는다.**
- **`pnpm dev`는 사용자가 직접 실행한다.** Claude가 백그라운드로 dev 서버를 띄우면 포트 3000 충돌이 난다. 검증이 필요하면 `pnpm build` / `tsc --noEmit` / curl 로 확인하고, 실행 중 서버가 필요하면 사용자에게 요청한다.
- DB/스키마 검증 시 `head:true` 카운트 쿼리는 존재하지 않는 테이블에도 에러를 안 내므로 신뢰하지 말 것 → 실제 `select`로 확인한다.
- **운영 중인 DB다.** 실제 학생 진도 데이터가 쌓여 있으므로 파괴적 SQL(`delete`/`drop`/재시드)은 반드시 사용자 확인 후 실행한다.
- DB 조회 스크립트는 프로젝트 안에서 실행해야 `node_modules` 해석이 된다(`_content/` 는 git 미추적이라 임시 스크립트 두기 좋음).

## 아키텍처

### 인증 / 세션
- **학생**: 전화번호(ID) + 4자리 PW. `students` 테이블. 가입은 **관리자 승인제**.
- **교수진(Admin)**: 이메일 + 강력한 PW. 시드 스크립트로만 발급. `admins` 테이블.
- 세션: 서명된 JWT를 `erau_session` httpOnly 쿠키에 저장(30일). `{ sub, role, name }`.
  - `src/lib/auth/session.ts` — `createSession` / `getSession` / `destroySession` / `requireRole`
- **로그인 횟수 제한**: DB 기반(`login_attempts`). 식별자 15분 내 5회 실패 / IP 20회 실패 시 429.
  - `src/lib/auth/rate-limit.ts`. 레이트리밋 조회와 계정 조회는 병렬, 시도 기록은 `after()`로 응답 후 처리.
- 라우트 보호는 **레이아웃/페이지의 서버 컴포넌트에서 `getSession()` 후 `redirect()`** 로 처리(미들웨어 미사용).

### 학생 상태 — `approved` × `approved_at` 조합 (중요 불변식)
| approved | approved_at | 상태 | 노출 위치 |
|---|---|---|---|
| false | NULL | **가입 대기** (아직 한 번도 승인 안 됨) | 대시보드 "가입 승인 대기" 목록 |
| true | 있음 | **활성** | 진도 표 |
| false | 있음 | **정지** (승인 이력은 있음) | 진도 표에 "정지" 뱃지 |

- 정지 시 `approved`만 false로 되돌리고 **`approved_at`은 유지** → 가입 대기와 구분된다.
  이 규칙이 `getPendingStudents()`(`approved_at is null`)와 `getDashboardSummary()`(`approved_at is not null`) 필터의 근거다.
- 승인/거절/정지/강퇴: `src/app/admin/(dash)/students/actions.ts`. 거절·강퇴는 계정 삭제(진도·잠금 FK cascade).

### 콘텐츠 모델 — 챕터 1개 : 클립 N개 + 자료 N개
- `chapters` → `videos`(YouTube 클립, 순서 있음) + `materials`(PDF, Supabase Storage)
- 진도는 **영상 단위**(`video_progress`), 수동 잠금 해제는 **챕터 단위**(`chapter_unlocks`)
- **자료 전용 챕터**(영상 0개, `materialsOnly`)는 항상 열려 있고 **잠금 체인과 진도율 분모에서 제외**된다.
- 자료 다운로드는 `/api/materials/[id]` → 권한 확인 후 **60초 서명 URL**로 리다이렉트(버킷은 비공개).

### 파일 업로드 — 반드시 브라우저 → 스토리지 직접 (중요)
**파일 바이트를 서버 액션/라우트로 중계하면 안 된다.** 세 겹의 상한에 걸린다:

| 제한 | 값 | 어디서 |
|---|---|---|
| Server Action 요청 본문 | **1MB** (기본값, `next.config.ts` 미설정) | Next.js — 로컬 dev에도 적용 |
| 함수 요청 본문 하드캡 | **4.5MB** (`vercel.json`으로도 못 올림) | Vercel |
| 함수 실행 시간 | **10초** | Vercel Hobby |

그래서 자료 업로드는 3단계다 (`chapters/actions.ts`):
1. `createMaterialUploadTicket(chapterId, fileName, size)` — 권한·확장자·크기 검증 후 **서명 업로드 URL만** 발급.
   경로는 서버가 정한다(`{chapterId}/{timestamp}_{safeName}`) — 클라이언트가 임의 경로를 덮어쓰지 못하게.
2. 브라우저가 그 URL로 **직접 PUT** — `src/lib/upload.ts`의 `putToSignedUrl`(진행률 때문에 fetch 대신 XHR).
   서명 URL에 토큰이 포함돼 있어 **인증 헤더도 anon 키도 필요 없다**(클라이언트에 키 노출 없음).
3. `finalizeMaterial(chapterId, path, title)` — 경로를 정규식으로 재검증하고, **크기는 클라이언트 신고값 대신
   Storage 메타데이터에서 읽어** DB 행 생성. 행 생성 실패 시 올라간 파일을 되돌려 지운다(고아 방지).

PDF 상한 `MAX_PDF_BYTES = 50_000_000`은 **버킷의 `file_size_limit`과 같은 값이어야 한다**(어긋나면 앱은 통과시키고
Storage가 거부하는 구간이 생긴다). 이 값 자체는 Supabase Free 플랜의 파일당 50MB 상한에서 온다.

### 진도 추적 (핵심)
- 플레이어: `src/components/YouTubePlayer.tsx` — YouTube IFrame Player API.
  - 500ms마다 재생 중일 때 `floor(currentTime)`를 `Set`에 누적(실제 본 초만 집계 → 건너뛰기는 진도 미인정).
  - 5초마다 + 일시정지/종료 시 `/api/progress`로 `{ video_id, watched_seconds(=Set 크기), last_position, duration }` 전송.
  - 이어보기: `start = last_position - 2`.
- 챕터 내 클립 선택 UI: `src/components/ChapterVideos.tsx` (자유 시청, 클립 8개 초과 시 목록 기본 접힘).
- 서버: `src/app/api/progress/route.ts`
  - 학생 세션 필수, **잠긴 챕터의 클립에는 기록 거부(403)**.
  - `watched_seconds`는 고점 유지(`max`), `watched_seconds/duration >= 0.9`면 `completed=true`.
  - `videos.duration_seconds`가 비어 있으면 최초 보고값으로 채움(진도율 계산용).

### 순차 잠금 로직
- `src/lib/db/learn.ts` — `getStudentChapters(studentId)`:
  공개(is_published) 챕터를 순서대로 보며 **이전 영상 챕터의 모든 클립 완료 시 다음 챕터 unlocked**. 첫 챕터는 항상 열림.
  자료 전용 챕터는 체인을 진행시키지 않고 통과.
- 교수진이 `chapter_unlocks.unlocked_override`로 특정 학생의 특정 챕터를 수동 개방 가능(`UnlockToggle`).
- 잠금 판정은 서버에서만(클라이언트 우회 불가). 진도 API·자료 API도 같은 판정을 재사용한다.

## 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx                     # 루트(한국어, Outfit+Pretendard, 색인 차단, SiteFooter)
│   ├── page.tsx                       # 랜딩 + 역할별 리다이렉트
│   ├── globals.css                    # Tailwind v4 + 뉴모피즘 토큰 + 랜딩 애니메이션
│   ├── opengraph-image.tsx            # OG 이미지 동적 생성(next/og, edge)
│   ├── robots.ts                      # 전체 크롤러 차단
│   ├── icon.svg
│   ├── (auth)/                        # 학생 로그인/가입 (로그인 시 리다이렉트)
│   │   ├── login/  signup/
│   ├── learn/                         # 학생 영역(레이아웃에서 student 강제)
│   │   ├── page.tsx                   # 강의 카드 목록(잠금·hover 상세)
│   │   ├── [chapterId]/page.tsx       # 플레이어 + 강의자료 + 전체강의 사이드바
│   │   └── mypage/{page.tsx,actions.ts}  # 진도 요약 · PW 변경 · 회원탈퇴
│   ├── admin/
│   │   ├── login/page.tsx             # Admin 로그인(공개)
│   │   └── (dash)/                    # 보호 영역(레이아웃에서 admin 강제)
│   │       ├── page.tsx               # KPI + 가입 승인 대기 + 진도 대시보드
│   │       ├── students/actions.ts    # 승인·거절·정지·PW초기화·강퇴
│   │       ├── students/[id]/{page.tsx,actions.ts}  # 학생 상세 + 챕터 수동 해제
│   │       └── chapters/{page.tsx,actions.ts}       # 챕터·클립·자료 CRUD
│   └── api/
│       ├── auth/{student,admin}/...   # 로그인/가입/로그아웃
│       ├── progress/route.ts          # 진도 하트비트
│       └── materials/[id]/route.ts    # 자료 다운로드(서명 URL)
├── components/
│   ├── AuthForm.tsx                   # 로그인/가입 공용 폼(플로팅 라벨, 전화번호 자동 하이픈)
│   ├── LandingReveal.tsx              # 랜딩 진입 수축 애니메이션(WAAPI + fixed 오버레이)
│   ├── SiteFooter.tsx                 # 전역 푸터(ERAU 비공식 면책 문구)
│   ├── NeuProgress.tsx                # 뉴모피즘 진도바
│   ├── YouTubePlayer.tsx              # 진도 추적 플레이어(client)
│   ├── ChapterVideos.tsx              # 챕터 내 클립 선택 + 플레이어
│   ├── MyAccount.tsx                  # PW 변경 · 회원탈퇴
│   ├── LogoutButton.tsx
│   └── admin/
│       ├── ChapterManager.tsx         # 챕터·클립·자료 CRUD UI
│       ├── PendingApprovals.tsx       # 가입 승인/거절
│       ├── StudentAdminActions.tsx    # 정지·PW초기화·강퇴
│       ├── StudentChapters.tsx        # 학생 상세 챕터 아코디언
│       └── UnlockToggle.tsx           # 챕터 수동 잠금 해제/되돌리기
└── lib/
    ├── supabase.ts                    # service_role 서버 클라이언트(server-only)
    ├── validation.ts                  # zod 스키마
    ├── upload.ts                      # 브라우저 → Storage 직접 업로드(XHR, 진행률)
    ├── phone.ts                       # 전화번호 표시(010-1234-5678)/입력 하이픈
    ├── youtube.ts                     # YouTube 링크/ID → 11자리 ID 추출
    ├── auth/{session,password,rate-limit,request}.ts
    └── db/{types,learn,progress}.ts
supabase/migrations/                   # 아래 표 참고
scripts/{seed-admin.mjs,seed-content.mjs}
_content/                              # PDF 원본 등 (git 미추적)
```

## DB 스키마 / 마이그레이션
**파일명 번호 = 실제 적용 순서.** Supabase SQL Editor에서 순서대로 실행한다(모두 `if not exists` 기반이라 재실행 안전).

| 파일 | 내용 |
|---|---|
| `0001_init.sql` | students / admins / chapters / progress / login_attempts |
| `0002_unlock_override.sql` | `progress.unlocked_override` 추가 (0003에서 `chapter_unlocks`로 이관됨) |
| `0003_videos_materials.sql` | **핵심 확장** — videos / materials / video_progress / chapter_unlocks 신설 + 기존 데이터 이관 |
| `0004_signup_approval.sql` | students에 `approved` / `approved_at` 추가 (가입 승인제) |
| `0005_drop_legacy.sql` | 레거시 제거 — `progress` 테이블, `chapters.youtube_id/duration_seconds/material_url` |

현재 사용 중인 테이블:
- `students(id, phone unique, password_hash, name, approved, approved_at, created_at)`
- `admins(id, email unique, password_hash, name, created_at)`
- `chapters(id, title, description, position, is_published, created_at, updated_at)`
- `videos(id, chapter_id, title, youtube_id, duration_seconds, position, created_at)`
- `materials(id, chapter_id, title, storage_path, size_bytes, position, created_at)`
- `video_progress(student_id, video_id, watched_seconds, last_position, completed, completed_at, updated_at)` — PK `(student_id, video_id)`
- `chapter_unlocks(student_id, chapter_id, unlocked_override, updated_at)` — PK `(student_id, chapter_id)`
- `login_attempts(id, identifier, kind, ip, success, attempted_at)`

Storage: `materials` 버킷(**비공개**). 경로 규칙 `{chapter_id}/{파일명}`.

스키마 변경 시: 다음 번호의 SQL 파일을 추가하고 Supabase SQL Editor에서 실행한다.
모든 DB 접근은 서버에서 service_role 키로만 → **RLS 미사용, anon 키는 클라이언트에 노출 금지.**

## 환경변수 (`.env.local`, git 미추적)
```
NEXT_PUBLIC_SUPABASE_URL=...          # Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=...         # service_role 키 (서버 전용, 절대 노출 금지)
SESSION_SECRET=...                    # 세션 JWT 서명 (64 hex)
```
`.env.example` 참고. `src/lib/supabase.ts`는 `server-only`로 클라이언트 번들 유입을 차단한다.

## 디자인 톤 — 뉴모피즘(Soft UI)
- 배경과 컴포넌트가 동일한 단색 `bg-slate-100`. 그라데이션/블롭/`backdrop-blur`/투명 배경 사용 금지.
- 공통 토큰(`globals.css`): `.neu-raised`(패널), `.neu-raised-sm`(작은 카드/행), `.neu-flat`(잠긴 카드·빈 상태), `.neu-header`(sticky 헤더), `.neu-input`, `.neu-btn`, `.neu-btn-primary`.
- 그림자: 좌상단 흰빛(`#ffffff`) + 우하단 회색(`#e3e8f0`) 커스텀 그림자. hover 시 안쪽 음각을 덧댄다.
- 포인트 컬러: blue-500(`--brand`). 진도바는 `NeuProgress`(파인 트랙 + blue-500 / gray 톤).
- 텍스트: 타이틀 `text-slate-700`, 서브 `text-slate-500`. 한국어 `word-break: keep-all`, 자연스러운 합니다체.
- 스크롤바는 전역 숨김(기능은 유지). 랜딩(`main[data-landing]`)은 `:has`로 스크롤 자체를 차단.
- 랜딩 진입 시퀀스: 전체화면 오버레이가 로그인 박스로 수축(1.6s) → 내용물 stagger 등장 → 푸터 슬라이드(2.2s) → 비행기 진입(2.4s). `prefers-reduced-motion` 존중.

## 운영 플랜과 그 한도 (2026-09-02 확인)
둘 다 **무료 플랜**이다. 설계 판단의 전제이므로 바꾸기 전에 확인할 것.

**Supabase Free**
- 저장 1GB (현재 사용 50.1MB) / egress 5GB+캐시 5GB 월 / **파일당 50MB** / DB 500MB
- **7일 무활동 시 프로젝트 자동 일시정지** → 사이트 전체 정지, 수동 복구 필요.
  학생 접속만으로는 이미 두 차례 7일을 넘겼고 관리자 로그인이 우연히 타이머를 리셋해 왔다.
- **백업 없음** — 학생 진도 데이터에 안전망이 없다.

**Vercel Hobby**
- Fast Data Transfer **100GB/월, 초과분 결제 불가(하드캡)** — 소진 시 30일간 차단
- 함수 실행 10초 / 호출 100만 회 월
- 약관상 **개인·비상업 용도 전용** — 수강료를 받는 과정이면 Pro 대상

## 알려진 한계 / 향후 작업
- **진도 부정 방지**: 클라이언트가 보고한 `watched_seconds`를 신뢰. 작정한 우회(직접 API 호출) 가능. 필요 시 서버 측 구간 검증 강화.
- **영상 유출**: YouTube 미등록 영상은 링크만 알면 사이트 밖에서도 시청 가능. 보호가 중요해지면 Vimeo(도메인 제한)/Cloudflare Stream 등으로 전환 검토.
- 인증 보안: 전화번호+4자리 PW는 폐쇄형 소수 그룹 전제. 횟수 제한으로 1차 방어.
- `login_attempts` 자동 정리(purge) 없음 — 소규모라 당장 문제는 아니나 누적된다.
- 가입 승인은 **관리자가 대시보드를 직접 봐야** 알 수 있다(알림 없음) → 대기자 방치 가능.
- README.md가 create-next-app 기본값 그대로.
- TODO: 모바일 반응형 QA, 접근성(a11y) 검토.

---

## 진행 중: 교수 영상 직접 업로드 (2026-09-02 기준)
> 완료되면 이 섹션은 지운다. 아래 "확정 사실"만 위 본문에 흡수시킬 것.

**요구사항**: 교수가 mp4를 직접 올려 학생에게 제공. 관리자 Content 화면에서
`Clip(YouTube)` 과 `자료 PDF` **사이**에 "영상 파일" 섹션을 추가한다. 기존 YouTube 클립 55개는 그대로 둔다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 업로드 통로 교체 (PDF로 검증) | **완료** — commit `e6f3faa` |
| 2 | 영상 저장소 결정 + 계정 | **대기 — 비용 발생 건이라 회사와 논의 중** |
| 3 | `videos` 테이블에 영상 종류 구분 추가 | 미착수 |
| 4 | 관리자 UI에 영상 업로드 섹션 | 미착수 |
| 5 | 학생 플레이어가 두 종류 모두 재생 | 미착수 |

**2단계 조사 결과 (재조사 불필요)**
- Supabase에 영상 저장은 **불가** — Free는 파일당 50MB. Pro로 올려도 연 $300에 **트랜스코딩이 없어**
  원본 화질/비트레이트가 그대로 전송량이 된다(비용 예측 불가).
- 권장: **Bunny Stream** — 저장 $0.01/GB/월, 전송 $0.03/GB(아시아), H.264 1080p 인코딩 무료,
  토큰 인증·도메인 제한·TUS 재개 업로드 포함. 영상 10시간·학생 15명 기준 **연 $12 수준**(최소 $1/월).
- 대안: Cloudflare Stream — 분 단위 과금($5/1,000분 저장, $1/1,000분 전송), 같은 규모에서 연 $70 수준.
- Bunny를 쓰면 영상 트래픽이 Vercel을 거치지 않으므로 Hobby의 100GB 하드캡과 무관해진다.

**3~5단계 설계 방향**
- `videos.source`('youtube'|'bunny') + `youtube_id` nullable화 + `asset_id` 추가 (마이그레이션 `0006`)
- 업로드는 1단계와 **동일한 티켓 방식**을 재사용하고 목적지만 바꾼다. `src/lib/upload.ts` 그대로 사용 가능.
- 플레이어만 분기(`YouTubePlayer` / HLS 플레이어). **진도 로직(초 단위 Set 누적, 90% 완료)과
  `/api/progress`는 `video_id` 기반이라 변경 없음.**

**재개 시 첫 질문**: 회사와의 논의 결과 — 영상 저장소에 비용 지출이 가능한가? 가능하면 Bunny 계정/API 키.
