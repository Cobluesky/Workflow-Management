# 아키텍처

## 1. 목표
- 인증은 `auth-server`와 `workspace_auth`에만 둔다.
- 공통 프로필과 워크스페이스 설정은 `workspace_core`에 둔다.
- 기능 데이터는 모듈별 DB로 분리한다.
- 사용자 연결 키는 장기적으로 `authUserId` 하나로 통일한다.

## 2. 현재 서비스 구성
- `auth.workspace.p-e.kr`
  - 중앙 인증 서버
- `app.workspace.p-e.kr`
  - 메인 워크스페이스 앱
- `project1.workspace.p-e.kr`
  - 향후 추가 서비스 예정

## 3. 데이터 소유권
### `workspace_auth`
- `User`
- `OAuthAccount`
- `RefreshToken`
- 인증의 유일한 진실 원본

### `workspace_core`
- `WorkspaceProfile`
- `WorkspaceModulePreference`
- `WorkspaceModuleState`
- 공통 프로필과 워크스페이스 설정 저장소

### `timetable_db`
- `User`
- `Lesson`
- timetable 레거시 로컬 사용자와 시간표 데이터

### `calendar_db`
- `CalendarEvent`
- 캘린더 이벤트 전용 저장소

### `tasks_db`
- `TaskItem`
- 할 일 전용 저장소

### `projects_db`
- 프로젝트 모듈 예정 저장소

## 4. 사용자 식별 규칙
- 전역 사용자 키는 `workspace_auth.User.id`
- 각 모듈 DB는 `authUserId`를 소유 키로 사용한다.
- 이메일 기반 매핑은 과도기 호환 레이어다.
- 보호 API는 클라이언트가 보낸 `userId`를 신뢰하지 않는다.

## 5. 인증 흐름
1. 클라이언트가 `auth-server`에서 로그인한다.
2. `auth-server`가 access token과 refresh cookie를 발급한다.
3. 앱 서버는 보호 API에서 `/auth/verify`로 access token을 검증한다.
4. 앱 서버는 timetable 쪽 legacy local user를 해석한다.
5. 공통 프로필이 필요할 때만 `workspace_core`를 사용한다.

## 6. 워크스페이스 셸
- [AppShell.tsx](/C:/workflow-management/app/AppShell.tsx)가 사이드바 셸을 담당한다.
- 활성 모듈 목록은 `/api/modules`를 통해 `workspace_core`에 저장한다.
- `workspace_core`가 일시적으로 내려가면 로컬 캐시를 fallback으로 사용한다.
- 장애 중 로컬에서 바뀐 모듈 구성은 복구 후 서버로 재전송한다.

## 7. Split 런타임 원칙
- `requireAppUser()`는 generic protected route를 위해 `workspace_core`에 의존하지 않는다.
- `ensureWorkspaceProfile()`는 core profile이 필요한 경로에서만 사용한다.
- core 복구 시 alias가 어긋나면 legacy alias와 core alias를 재조정한다.
- 기본 모듈 시드는 idempotent해야 하며 중복 초기화로 500이 나면 안 된다.

## 8. Prisma 구조
- 루트 [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma)는 timetable 전용 schema다.
- split schema는 아래 파일을 사용한다.
  - [prisma/schemas/core.prisma](/C:/workflow-management/prisma/schemas/core.prisma)
  - [prisma/schemas/timetable.prisma](/C:/workflow-management/prisma/schemas/timetable.prisma)
  - [prisma/schemas/calendar.prisma](/C:/workflow-management/prisma/schemas/calendar.prisma)
  - [prisma/schemas/tasks.prisma](/C:/workflow-management/prisma/schemas/tasks.prisma)
- 배포 시 migrator는 `timetable -> core -> calendar -> tasks` 순으로 schema를 반영한다.

## 9. 현재 상태
- `workspace_core` 런타임 연결 완료
- `calendar_db` 런타임 분리 완료
- `tasks_db` 런타임 분리 완료
- `projects_db`는 아직 planned 상태
- `timetable_db`에는 legacy `User`가 남아 있으며 장기적으로 더 축소할 예정이다.

## 10. 다음 단계
- `projects_db`와 프로젝트 모듈 구현
- timetable legacy `User.password` 제거 수순 정리
- `timetable_db`에 남아 있는 legacy 테이블 정리
- split DB 검증 자동화 보강
