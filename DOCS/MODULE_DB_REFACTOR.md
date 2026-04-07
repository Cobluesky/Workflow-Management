# 모듈 DB 분리 리팩토링 계획

## 1. 목적
- 현재 루트 앱은 `timetable_db` 하나에 시간표, 캘린더, 할 일, 워크스페이스 설정을 함께 저장하고 있다.
- 이 구조는 초기 구현 속도에는 유리했지만, 모듈 수가 늘어날수록 변경 영향 범위가 커지고 배포 리스크가 증가한다.
- 앞으로 모듈이 10개 이상, 장기적으로 20개 이상으로 늘어날 가능성을 고려하면 지금부터 DB 경계를 분리하는 것이 맞다.

## 2. 현재 문제
- 모듈 하나의 스키마 변경이 전체 앱 DB 마이그레이션으로 번진다.
- `calendar`, `tasks` 같은 새 모듈을 붙일수록 `timetable_db`가 루트 앱의 임시 통합 저장소처럼 커진다.
- 모듈별 독립 배포, 독립 권한, 독립 운영 정책을 적용하기 어렵다.
- Prisma schema가 커질수록 리뷰, 테스트, 배포 검증 범위가 계속 넓어진다.

## 3. 목표 구조

### 3.1 인증
- `workspace_auth`
  - 인증 전용 DB
  - 사용자 계정, 비밀번호 해시, OAuth 계정, Refresh Token 저장

### 3.2 공통 워크스페이스
- `workspace_core` 또는 `profile_db`
  - 사용자 프로필
  - 사이드바 활성 모듈 구성
  - 워크스페이스 공통 설정

### 3.3 모듈별 저장소
- `timetable_db`
  - 시간표 전용
- `calendar_db`
  - 캘린더 전용
- `tasks_db`
  - 할 일 전용
- `projects_db`
  - 프로젝트 전용

## 4. 데이터 경계 원칙
- 전역 사용자 식별자는 항상 `authUserId`를 사용한다.
- 모듈 DB는 인증 정보를 저장하지 않는다.
- 모듈 DB에 로컬 `User` 테이블을 두기보다, 가능하면 `authUserId` 기반 소유 모델로 단순화한다.
- 공통 프로필과 모듈 설정은 개별 모듈 DB가 아니라 `workspace_core`로 모은다.

## 5. Prisma 분리 전략
- 현재 [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma) 는 과도기 통합 schema로 본다.
- 목표는 schema와 client를 모듈별로 분리하는 것이다.

예시:
- `prisma/schemas/core.prisma`
- `prisma/schemas/timetable.prisma`
- `prisma/schemas/calendar.prisma`
- `prisma/schemas/tasks.prisma`
- `prisma/schemas/projects.prisma`

예시 생성 경로:
- `prisma/generated/core`
- `prisma/generated/timetable`
- `prisma/generated/calendar`
- `prisma/generated/tasks`
- `prisma/generated/projects`

### 현재 전환 상태
- `prisma/schema.prisma`는 아직 현재 단일 app DB(`timetable_db`)를 위한 통합 migration 기준 파일로 유지한다.
- runtime Prisma client는 아래 도메인별 진입점으로 분리하기 시작했다.
  - `lib/prisma/core.ts`
  - `lib/prisma/timetable.ts`
  - `lib/prisma/calendar.ts`
  - `lib/prisma/tasks.ts`
- 각 client는 우선 같은 `DATABASE_URL`을 fallback으로 사용하고, 이후 물리적 DB 분리 시 도메인별 env로 전환한다.
- 주의:
  - 부분 schema(`prisma/schemas/*.prisma`)는 아직 `db push` 기준이 아니다.
  - `db push`는 계속 통합 [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma) 기준으로만 실행한다.
  - 부분 schema는 runtime 경계 분리와 future DB split 준비를 위한 generated client 용도다.

## 6. 리팩토링 순서

### 1단계: 공통 데이터 분리
- `WorkspaceModulePreference`를 `workspace_core`로 이동
- 프로필/별명 같은 사용자 설정도 `workspace_core`로 이동
- 루트 앱은 공통 설정용 Prisma client를 별도로 사용

### 2단계: `tasks` 분리
- `TaskItem`을 `tasks_db`로 이동
- `/api/tasks`는 tasks 전용 Prisma client를 사용
- `tasks` 데이터 소유키는 로컬 `User.id`가 아니라 `authUserId`를 사용한다.
- `tasks` 모듈은 첫 번째 독립 DB 사례로 삼는다

### 3단계: `calendar` 분리
- `CalendarEvent`를 `calendar_db`로 이동
- `/api/calendar`는 calendar 전용 Prisma client를 사용

### 4단계: 루트 앱 DB 축소
- `timetable_db`를 시간표 전용으로 축소
- 남은 공통/임시 테이블 제거

### 5단계: 신규 모듈 원칙 고정
- 이후 추가되는 모듈은 처음부터 별도 DB와 별도 Prisma schema로 시작

## 7. 배포 원칙
- 모듈별로 runtime image와 migrator image를 분리한다.
- 배포 순서는 항상 `migrator -> runtime` 으로 유지한다.
- 한 모듈의 마이그레이션 실패가 다른 모듈 runtime 교체를 막지 않도록 분리한다.

## 8. 지금 바로 필요한 작업
- `workspace_core`의 책임 범위 확정
- `tasks_db`를 첫 분리 대상으로 선정
- Prisma multi-schema 구조 초안 작성 완료
- `lib/prisma.ts` 단일 client 의존 경로를 모듈별 client 진입점으로 분리 시작

## 9. 리팩토링 기준
- “지금 편해서 한 DB에 둔다”는 판단은 더 이상 기본값이 아니다.
- 새 모듈은 DB 분리를 전제로 설계한다.
- 기존 모듈은 `tasks -> calendar -> profile/core` 순서로 점진 분리한다.
