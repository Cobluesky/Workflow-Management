# 파일별 기능 명세

## 목적
- 어떤 파일이 어떤 책임을 가지는지 빠르게 파악하기 위한 문서
- 코드 리뷰, 온보딩, 리팩토링 범위 파악의 기준 문서

## 라우트 / 화면 엔트리
### [app/page.tsx](/C:/workflow-management/app/page.tsx)
- `/`
- 시간표 메인 화면

### [app/mypage/page.tsx](/C:/workflow-management/app/mypage/page.tsx)
- `/mypage`
- 프로필/별명 화면

### [app/calendar/page.tsx](/C:/workflow-management/app/calendar/page.tsx)
- `/calendar`
- 캘린더 모듈 엔트리
- 현재 런타임 저장소: `calendar_db`

### [app/tasks/page.tsx](/C:/workflow-management/app/tasks/page.tsx)
- `/tasks`
- 할 일 모듈 엔트리
- 현재 런타임 저장소: `tasks_db`

### [app/projects/page.tsx](/C:/workflow-management/app/projects/page.tsx)
- `/projects`
- 프로젝트 모듈 플레이스홀더
- 목표 저장소: `projects_db`

## 공통 UI
### [app/AppShell.tsx](/C:/workflow-management/app/AppShell.tsx)
- 워크스페이스 사이드바 셸
- 활성 모듈 렌더링
- 모듈 추가/제거 UI
- 서버 저장 실패 시 사용자별 로컬 캐시 fallback
- core 복구 후 미반영 모듈 변경 재전송

### [app/Navbar.tsx](/C:/workflow-management/app/Navbar.tsx)
- 상단 네비게이션

### [app/moduleRegistry.ts](/C:/workflow-management/app/moduleRegistry.ts)
- 모듈 메타데이터 정의
- 현재 저장소 표시
  - `timetable` -> `timetable_db`
  - `mypage` -> `workspace_core`
  - `calendar` -> `calendar_db`
  - `tasks` -> `tasks_db`
  - `projects` -> `projects_db` planned

### [app/Providers.tsx](/C:/workflow-management/app/Providers.tsx)
- 클라이언트 인증 컨텍스트
- access token / refresh 처리

## 모듈 UI 본체
### [app/calendar/CalendarModule.tsx](/C:/workflow-management/app/calendar/CalendarModule.tsx)
- 월간 캘린더 UI
- 일정 CRUD 모달

### [app/tasks/TaskModule.tsx](/C:/workflow-management/app/tasks/TaskModule.tsx)
- 할 일 목록/필터/편집 UI

## API
### [app/api/timetable/route.ts](/C:/workflow-management/app/api/timetable/route.ts)
- 시간표 조회/저장
- `timetable_db`

### [app/api/user/route.ts](/C:/workflow-management/app/api/user/route.ts)
- alias 조회/수정
- `workspace_core.WorkspaceProfile`
- core 미준비 시 legacy fallback

### [app/api/modules/route.ts](/C:/workflow-management/app/api/modules/route.ts)
- 활성 모듈 목록 조회/저장
- `workspace_core.WorkspaceModulePreference`
- `workspace_core.WorkspaceModuleState`
- 기본 모듈 시드 idempotent 처리

### [app/api/calendar/route.ts](/C:/workflow-management/app/api/calendar/route.ts)
- 캘린더 일정 CRUD
- `calendar_db`
- `authUserId` 기준 소유권

### [app/api/tasks/route.ts](/C:/workflow-management/app/api/tasks/route.ts)
- 할 일 CRUD
- `tasks_db`
- `authUserId` 기준 소유권

## 인증 / 서버 유틸
### [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts)
- access token 검증
- legacy timetable local user 해석
- `requireAppUser()`는 `workspace_core`에 의존하지 않음
- `ensureWorkspaceProfile()`는 core profile을 보장하고 alias mismatch를 복구
- `syncLegacyLocalAlias()`는 legacy alias를 core 값으로 동기화

### [lib/prisma/core.ts](/C:/workflow-management/lib/prisma/core.ts)
- `workspace_core` 전용 Prisma client
- 운영: `WORKSPACE_CORE_DATABASE_URL` 필수
- 개발: `DATABASE_URL` fallback 허용

### [lib/prisma/timetable.ts](/C:/workflow-management/lib/prisma/timetable.ts)
- `timetable_db` 전용 Prisma client

### [lib/prisma/calendar.ts](/C:/workflow-management/lib/prisma/calendar.ts)
- `calendar_db` 전용 Prisma client
- 운영: `CALENDAR_DATABASE_URL` 필수

### [lib/prisma/tasks.ts](/C:/workflow-management/lib/prisma/tasks.ts)
- `tasks_db` 전용 Prisma client
- 운영: `TASKS_DATABASE_URL` 필수

### [lib/prisma/shared.ts](/C:/workflow-management/lib/prisma/shared.ts)
- split DB URL 해석
- storage unavailable 판별 helper

## Prisma / 배포
### [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma)
- timetable 전용 root schema

### [prisma/schemas/core.prisma](/C:/workflow-management/prisma/schemas/core.prisma)
### [prisma/schemas/timetable.prisma](/C:/workflow-management/prisma/schemas/timetable.prisma)
### [prisma/schemas/calendar.prisma](/C:/workflow-management/prisma/schemas/calendar.prisma)
### [prisma/schemas/tasks.prisma](/C:/workflow-management/prisma/schemas/tasks.prisma)
- workspace별 generated client source schema

### [scripts/run-prisma-workspaces.mjs](/C:/workflow-management/scripts/run-prisma-workspaces.mjs)
- `generate` / `db-push` 실행기
- `timetable`, `core`, `calendar`, `tasks` 분리 실행

### [Dockerfile](/C:/workflow-management/Dockerfile)
- runtime / migrator 이미지 구성

### [.github/workflows/deploy.yml](/C:/workflow-management/.github/workflows/deploy.yml)
- `db-push timetable -> core -> calendar -> tasks`
- 그 후 runtime 컨테이너 교체
