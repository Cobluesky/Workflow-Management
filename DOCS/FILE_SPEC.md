# 파일별 기능 명세

## 1. 문서 목적
- 이 문서는 현재 프로젝트에서 "어떤 파일이 어떤 역할을 하는가"를 빠르게 파악하기 위한 파일 맵이다.
- 코드 리뷰, 인수인계, 신규 모듈 추가, 리팩토링 범위 파악 시 기준 문서로 사용한다.

## 2. 라우트 / 화면 진입점

### [app/page.tsx](/C:/workflow-management/app/page.tsx)
- 현재 메인 페이지다.
- `/` 경로를 담당한다.
- 시간표 조회/편집 UI를 렌더링한다.
- 인증 상태를 읽고 `/api/timetable`과 연동한다.
- [app/AppShell.tsx](/C:/workflow-management/app/AppShell.tsx) 안에서 시간표 모듈로 렌더링된다.

### [app/mypage/page.tsx](/C:/workflow-management/app/mypage/page.tsx)
- `/mypage` 경로를 담당한다.
- 현재 로그인한 사용자의 별명(alias) 조회/수정 UI를 제공한다.
- `/api/user`와 연동한다.

### [app/login/page.tsx](/C:/workflow-management/app/login/page.tsx)
- `/login` 경로를 담당한다.
- 이메일/비밀번호 로그인과 Google/GitHub/Kakao 로그인 진입 버튼을 제공한다.

### [app/signup/page.tsx](/C:/workflow-management/app/signup/page.tsx)
- `/signup` 경로를 담당한다.
- 중앙 인증 서버 회원가입 폼을 렌더링한다.
- 프론트 validation을 선행하고, 가입 성공 시 로그인 흐름으로 연결한다.

### [app/login/callback/page.tsx](/C:/workflow-management/app/login/callback/page.tsx)
- OAuth 로그인 후 복귀 페이지다.
- query string의 `accessToken`을 읽어서 클라이언트 세션에 반영한다.

### [app/calendar/page.tsx](/C:/workflow-management/app/calendar/page.tsx)
- `/calendar` 경로 엔트리 페이지다.
- [app/calendar/CalendarModule.tsx](/C:/workflow-management/app/calendar/CalendarModule.tsx) 를 렌더링한다.
- 현재는 앱 DB를 사용하고, 장기적으로 `calendar_db`를 목표 저장소로 둔다.

### [app/tasks/page.tsx](/C:/workflow-management/app/tasks/page.tsx)
- `/tasks` 경로 엔트리 페이지다.
- [app/tasks/TaskModule.tsx](/C:/workflow-management/app/tasks/TaskModule.tsx) 를 렌더링한다.
- 현재는 앱 DB를 사용하고, 장기적으로 `tasks_db`를 목표 저장소로 둔다.

### [app/projects/page.tsx](/C:/workflow-management/app/projects/page.tsx)
- `/projects` 플레이스홀더 페이지다.
- planned 모듈이며 향후 `projects_db`를 목표 저장소로 둔다.

## 3. 앱 셸 / 공통 UI

### [app/calendar/CalendarModule.tsx](/C:/workflow-management/app/calendar/CalendarModule.tsx)
- 캘린더 모듈의 실제 UI 본체다.
- 월간 캘린더, 일정 생성/수정/삭제 모달, 월 이동 UI를 담당한다.
- `/api/calendar` 과 연동한다.

### [app/tasks/TaskModule.tsx](/C:/workflow-management/app/tasks/TaskModule.tsx)
- 할 일 모듈의 실제 UI 본체다.
- 작업 보드, 상태 필터, 검색, 작업 생성/수정/삭제 모달을 담당한다.
- `/api/tasks` 와 연동한다.

### [app/layout.tsx](/C:/workflow-management/app/layout.tsx)
- 앱 전역 layout이다.
- [app/Providers.tsx](/C:/workflow-management/app/Providers.tsx) 와 [app/Navbar.tsx](/C:/workflow-management/app/Navbar.tsx) 를 감싼다.

### [app/AppShell.tsx](/C:/workflow-management/app/AppShell.tsx)
- 워크스페이스 사이드바 셸이다.
- 활성 모듈 렌더링
- 모듈 제거(`X`)
- 하단 `+` 버튼과 모듈 추가 모달
- `/api/modules` 기반 사용자별 모듈 구성 로딩/저장

### [app/Navbar.tsx](/C:/workflow-management/app/Navbar.tsx)
- 공개/로그인 상태에 따라 상단 내비게이션을 렌더링한다.

### [app/moduleRegistry.ts](/C:/workflow-management/app/moduleRegistry.ts)
- 워크스페이스 모듈 메타데이터 정의 파일이다.
- 모듈 ID, 라벨, 경로, 설명, 상태(`live`/`planned`), 현재 저장소, 계획 저장소를 관리한다.
- 기본 활성 모듈 목록도 여기서 정의한다.

### [app/Providers.tsx](/C:/workflow-management/app/Providers.tsx)
- 클라이언트 인증 컨텍스트 제공자다.
- 로그인, 회원가입, 로그아웃, refresh, verify, OAuth callback 토큰 소비를 담당한다.
- 중앙 인증 서버와 브라우저 세션 복구 로직의 핵심 파일이다.

## 4. 앱 API 라우트

### [app/api/timetable/route.ts](/C:/workflow-management/app/api/timetable/route.ts)
- 시간표 조회/저장 API다.
- `GET /api/timetable`
- `POST /api/timetable`
- 항상 [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 를 통해 인증된 로컬 사용자 기준으로 동작한다.

### [app/api/user/route.ts](/C:/workflow-management/app/api/user/route.ts)
- 사용자 별명 조회/수정 API다.
- `GET /api/user`
- `PATCH /api/user`

### [app/api/modules/route.ts](/C:/workflow-management/app/api/modules/route.ts)
- 사용자별 활성 모듈 목록 조회/저장 API다.
- `GET /api/modules`
- `PATCH /api/modules`
- `WorkspaceModulePreference` 테이블을 사용한다.

### [app/api/calendar/route.ts](/C:/workflow-management/app/api/calendar/route.ts)
- 캘린더 이벤트 조회/생성/수정/삭제 API다.
- `GET /api/calendar`
- `POST /api/calendar`
- `PATCH /api/calendar`
- `DELETE /api/calendar`

### [app/api/tasks/route.ts](/C:/workflow-management/app/api/tasks/route.ts)
- 할 일 조회/생성/수정/삭제 API다.
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks`
- `DELETE /api/tasks`

### [app/api/auth/signup/route.ts](/C:/workflow-management/app/api/auth/signup/route.ts)
- 기존 로컬 회원가입 경로를 막기 위한 legacy route다.
- 현재는 `410 Gone` 성격의 차단 엔드포인트다.

### [app/api/auth/[...nextauth]/route.ts](/C:/workflow-management/app/api/auth/[...nextauth]/route.ts)
- 과거 `next-auth` 호환 경로를 막기 위한 legacy route다.

## 5. 공통 라이브러리

### [lib/auth-config.ts](/C:/workflow-management/lib/auth-config.ts)
- Auth Server URL, Access Token storage key 같은 인증 관련 상수를 관리한다.

### [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts)
- 서버 측 인증 핵심 파일이다.
- Bearer Access Token 추출
- Auth Server `/auth/verify` 호출
- 로컬 `User`를 `authUserId` 우선, 이메일 fallback 기준으로 연결
- 인증 실패 / upstream 실패 / 로컬 충돌을 구분해 응답

### [lib/prisma.ts](/C:/workflow-management/lib/prisma.ts)
- 멀티 스키마 전환 중에는 호환성 alias entry로 본다.

### [lib/prisma/core.ts](/C:/workflow-management/lib/prisma/core.ts)
- `workspace_core` 책임 범위를 위한 Prisma client 진입점이다.
- 현재는 `WORKSPACE_CORE_DATABASE_URL ?? DATABASE_URL`을 사용한다.

### [lib/prisma/timetable.ts](/C:/workflow-management/lib/prisma/timetable.ts)
- 시간표 전용 Prisma client 진입점이다.
- 현재는 `TIMETABLE_DATABASE_URL ?? DATABASE_URL`을 사용한다.

### [lib/prisma/calendar.ts](/C:/workflow-management/lib/prisma/calendar.ts)
- 캘린더 전용 Prisma client 진입점이다.
- 현재는 `CALENDAR_DATABASE_URL ?? DATABASE_URL`을 사용한다.

### [lib/prisma/tasks.ts](/C:/workflow-management/lib/prisma/tasks.ts)
- 할 일 전용 Prisma client 진입점이다.
- 현재는 `TASKS_DATABASE_URL ?? DATABASE_URL`을 사용한다.
- 루트 앱 Prisma client 싱글턴 제공 파일이다.

## 6. 데이터 모델

### [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma)
- 실제 `db push`와 app migrator는 이 파일을 기준으로 동작한다.

### [prisma/schemas/core.prisma](/C:/workflow-management/prisma/schemas/core.prisma)
- `workspace_core` 책임 범위를 분리하기 위한 generated client source schema다.

### [prisma/schemas/timetable.prisma](/C:/workflow-management/prisma/schemas/timetable.prisma)
- 시간표 전용 generated client source schema다.

### [prisma/schemas/calendar.prisma](/C:/workflow-management/prisma/schemas/calendar.prisma)
- 캘린더 전용 generated client source schema다.

### [prisma/schemas/tasks.prisma](/C:/workflow-management/prisma/schemas/tasks.prisma)
- 할 일 전용 generated client source schema다.

### [scripts/run-prisma-workspaces.mjs](/C:/workflow-management/scripts/run-prisma-workspaces.mjs)
- 도메인별 Prisma generated client를 순차 생성하는 스크립트다.
- `npm run prisma:generate`에서 사용한다.
- 루트 앱의 Prisma 스키마다.
- 현재는 과도기 통합 schema로 `timetable_db` 구조를 정의한다.
- 주요 모델
  - `User`
  - `Lesson`
  - `CalendarEvent`
  - `TaskItem`
  - `WorkspaceModulePreference`

### [DOCS/MODULE_DB_REFACTOR.md](/C:/workflow-management/DOCS/MODULE_DB_REFACTOR.md)
- 모듈 DB 분리 리팩토링의 기준 문서다.
- `workspace_core`, `tasks_db`, `calendar_db` 등 목표 저장소 구조와 단계별 이동 순서를 설명한다.

### [prisma.config.ts](/C:/workflow-management/prisma.config.ts)
- Prisma CLI 설정 파일이다.
- 루트 `.env`의 `DATABASE_URL`을 기준으로 CLI가 동작하도록 맞춘다.

## 7. 배포 / 운영

### [Dockerfile](/C:/workflow-management/Dockerfile)
- 루트 앱 Docker 멀티스테이지 빌드 파일이다.
- `runner`는 앱 실행 이미지
- `migrator`는 app DB 스키마 반영용 이미지

### [.github/workflows/deploy.yml](/C:/workflow-management/.github/workflows/deploy.yml)
- GitHub Actions 배포 파이프라인이다.
- app/auth 이미지 빌드 및 Docker Hub push
- OCI 배포
- auth migration
- app migrator 실행 후 app 컨테이너 교체

## 8. 문서

### [DOCS/ARCHITECTURE.md](/C:/workflow-management/DOCS/ARCHITECTURE.md)
- 현재 구조와 목표 구조를 설명하는 기준 설계 문서

### [DOCS/API_SPEC.md](/C:/workflow-management/DOCS/API_SPEC.md)
- Auth Server API 및 루트 앱 모듈 API 계약 정리 문서

### [DOCS/DEPLOYMENT.md](/C:/workflow-management/DOCS/DEPLOYMENT.md)
- OCI/Docker/Nginx/GitHub Actions 운영 배포 절차 문서

### [DOCS/HANDOUT.md](/C:/workflow-management/DOCS/HANDOUT.md)
- 발표/공유용 요약 문서

### [DOCS/TODO.md](/C:/workflow-management/DOCS/TODO.md)
- 현재 완료/남은 작업을 관리하는 문서

## 9. 읽는 순서 추천
1. [DOCS/HANDOUT.md](/C:/workflow-management/DOCS/HANDOUT.md)
2. [DOCS/ARCHITECTURE.md](/C:/workflow-management/DOCS/ARCHITECTURE.md)
3. [app/page.tsx](/C:/workflow-management/app/page.tsx)
4. [app/AppShell.tsx](/C:/workflow-management/app/AppShell.tsx)
5. [app/Providers.tsx](/C:/workflow-management/app/Providers.tsx)
6. [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts)
7. [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma)

## 10. Split Rollout Notes
- [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts)
  `requireAppUser()` only verifies the access token and resolves the legacy timetable-side local user. It must not depend on `workspace_core` for generic protected routes. `ensureWorkspaceProfile()` and `syncLegacyLocalAlias()` are the core-only profile helpers.
- [lib/prisma/core.ts](/C:/workflow-management/lib/prisma/core.ts)
  In production, `WORKSPACE_CORE_DATABASE_URL` is required. The client only falls back to `DATABASE_URL` outside production to keep local development workable during the split rollout.
- [lib/prisma/calendar.ts](/C:/workflow-management/lib/prisma/calendar.ts)
  `CALENDAR_DATABASE_URL` is required for production split deploys. Missing split URLs should fail the deploy rather than silently writing into `timetable_db`.
- [lib/prisma/tasks.ts](/C:/workflow-management/lib/prisma/tasks.ts)
  `TASKS_DATABASE_URL` is required for production split deploys. Missing split URLs should fail the deploy rather than silently writing into `timetable_db`.
- [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma)
  The root schema is now timetable-only. `workspace_core`, `calendar`, and `tasks` tables are pushed through their dedicated schemas under [prisma/schemas](/C:/workflow-management/prisma/schemas).
