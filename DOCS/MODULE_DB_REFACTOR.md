# 모듈 DB 분리 리팩토링

## 목표
- 인증은 `workspace_auth`
- 공통 프로필/모듈 설정은 `workspace_core`
- 기능 데이터는 모듈별 DB
- 사용자 소유 키는 `authUserId`

## 현재 상태
- `workspace_core` 런타임 분리 완료
- `calendar_db` 런타임 분리 완료
- `tasks_db` 런타임 분리 완료
- `projects_db`는 아직 planned
- root timetable schema와 legacy local user는 아직 남아 있다.

## 이미 정리된 것
- `requireAppUser()`는 `workspace_core` 없이도 보호 API를 통과할 수 있다.
- `ensureWorkspaceProfile()`는 core profile 보장과 alias 재조정을 담당한다.
- `/api/modules`는 core 장애 시 fallback 응답을 주고, 클라이언트는 로컬 캐시를 유지한다.
- core 복구 후 미반영 모듈 변경은 재전송된다.
- 기본 모듈 시드는 idempotent하게 초기화된다.
- `calendar`와 `tasks`는 각 전용 Prisma client를 사용한다.

## 남은 단계
### 1. core authoritative 정리
- `workspace_core`를 공통 프로필/모듈 설정의 단일 저장소로 확정
- legacy alias 동기화 경로 유지 여부 결정

### 2. timetable legacy 축소
- `timetable_db`에서 더 이상 공통 프로필 역할을 하지 않게 정리
- legacy `User.password` 제거 시점 확정
- legacy 보조 컬럼 정리

### 3. projects 분리
- `projects_db` schema 추가
- 프로젝트 모듈 runtime/client/migrator 추가

### 4. split 검증 자동화
- deploy 이후 DB별 smoke check
- core/calendar/tasks split 경로 회귀 테스트

## 운영 원칙
- 운영에서는 split DB URL 누락 시 fail-fast
- migrator가 runtime보다 먼저 돈다.
- 모듈 DB는 인증 정보를 저장하지 않는다.
- cross-DB FK 대신 `authUserId` 기반 애플리케이션 레벨 참조를 사용한다.
