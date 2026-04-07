# 아키텍처 설계서

## 1. 문서 목적
- 중앙 인증 서버 분리 이후의 현재 구조와 목표 구조를 함께 설명한다.
- 인증, 앱 데이터, 배포 책임이 어디에 있는지 한눈에 보이도록 정리한다.
- 이후 `TODO`, `API_SPEC`, `DEPLOYMENT` 문서가 참조할 기준 설계 문서 역할을 한다.

## 2. 아키텍처 목표
- 인증 책임은 `auth-server`에 집중시킨다.
- 각 서비스는 비즈니스 데이터만 관리하고, 사용자 인증 여부는 Auth Server 결과를 신뢰한다.
- 향후 `project1` 같은 추가 서비스도 동일한 인증 서버를 공유할 수 있게 한다.
- 장기 식별자는 이메일이 아니라 `authUserId`를 기준으로 맞춘다.

## 3. 서비스 구성
### 3.1 서비스 노드
- `auth.workspace.p-e.kr`
  - 중앙 인증 서버
  - 회원가입, 로그인, Refresh, Verify, Logout, OAuth 처리
- `app.workspace.p-e.kr`
  - 메인 시간표 서비스
  - 시간표, 별명, 앱 전용 사용자 프로필 관리
- `project1.workspace.p-e.kr`
  - 향후 동일한 인증 서버를 재사용할 추가 서비스

### 3.2 운영 프록시
- Reverse Proxy: Nginx
- `auth.workspace.p-e.kr -> 127.0.0.1:4000`
- `app.workspace.p-e.kr -> 127.0.0.1:3000`

## 4. 책임 분리
### 4.1 Auth Server 책임
- 로컬 계정 생성
- 비밀번호 해시 저장 및 검증
- OAuth 계정 연결
- Access Token 발급
- Refresh Token 저장, 회전, 폐기
- Access Token 검증
- 공통 사용자 식별자 관리

### 4.2 App Service 책임
- Auth Server가 검증한 사용자 기준으로 앱 데이터 처리
- 시간표, 별명, 화면 상태 등 앱 도메인 데이터 저장
- 자체 세션 발급 금지
- 클라이언트가 보낸 `userId`를 신뢰하지 않음

### 4.3 Workspace Shell 책임
- 사이드바 모듈 목록 렌더링
- 활성 모듈 추가/제거
- 사용자별 모듈 구성 저장
- 현재 저장소와 계획 저장소를 함께 표시
- 모듈별 독립 DB 전환을 위한 진입점 제공

## 5. 데이터 소유권
### 5.1 Auth DB: `workspace_auth`
- 인증의 단일 진실 원본
- 주요 테이블
  - `User`
  - `OAuthAccount`
  - `RefreshToken`

### 5.2 App DB: `timetable_db`
- 시간표 앱 도메인 데이터 저장소
- 주요 테이블
  - `User`
  - `Lesson`
  - `CalendarEvent`
  - `TaskItem`
  - `WorkspaceModulePreference`

### 5.3 데이터 규칙
- `workspace_auth.User`
  - 이메일
  - 비밀번호 해시
  - 이름
  - 역할
  - 활성화 상태
- `timetable_db.User`
  - `authUserId`
  - 이메일
  - alias
  - 앱 로컬 프로필
- `timetable_db.WorkspaceModulePreference`
  - `userId`
  - `moduleId`
  - `position`
  - 사용자별 사이드바 모듈 구성
- `timetable_db.User.password`는 장기적으로 제거 대상이다.

### 5.4 모듈 저장소 전략
- 현재 운영 중인 루트 앱은 단일 Prisma datasource를 사용한다.
- 이 구조는 초기 구현을 빠르게 닫기 위한 과도기 상태이며, 장기 기본 구조로 유지하지 않는다.
- 따라서 지금 시점의 모듈 분리는 "워크스페이스/도메인 경계"와 "저장소 계획"까지 반영된 상태다.
- 현재 저장소
  - 시간표: `timetable_db`
  - 마이페이지: `timetable_db`
  - 캘린더: `timetable_db`
  - 할 일: `timetable_db`
- 계획 저장소
  - 마이페이지: `profile_db`
  - 캘린더: `calendar_db`
  - 할 일: `tasks_db`
  - 프로젝트: `projects_db`
- UI에는 현재 저장소와 계획 저장소를 구분해서 노출한다.

### 5.5 목표 분리 구조
- `workspace_auth`
  - 인증 전용
- `workspace_core` 또는 `profile_db`
  - 사용자 프로필
  - 워크스페이스 공통 설정
  - `WorkspaceModulePreference`
- `timetable_db`
  - 시간표 전용
- `calendar_db`
  - 캘린더 전용
- `tasks_db`
  - 할 일 전용
- `projects_db`
  - 프로젝트 전용

### 5.6 분리 원칙
- 새 모듈은 가능하면 처음부터 별도 DB를 전제로 설계한다.
- 공통 데이터는 모듈 DB가 아니라 `workspace_core`에 모은다.
- 모듈 DB는 인증 정보를 저장하지 않고 `authUserId`를 기준으로 사용자 소유권을 연결한다.

## 6. 사용자 식별 전략
### 6.1 현재 상태
- 루트 앱은 [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 에서 Access Token을 검증한 뒤 로컬 `User`를 `authUserId` 우선, 이메일 fallback 기준으로 연결한다.
- 이메일 연결은 과도기 호환 레이어다.

### 6.2 목표 상태
- 전역 사용자 식별자는 `workspace_auth.User.id`
- 각 서비스 DB는 `authUserId`로 사용자 row를 연결
- 이메일은 동기화용 속성으로만 사용

## 7. 인증 흐름
### 7.1 로컬 로그인
1. 클라이언트가 `auth-server`에 이메일/비밀번호를 전송한다.
2. `auth-server`가 `workspace_auth`에서 계정을 검증한다.
3. Access Token을 응답 바디로 반환한다.
4. Refresh Token은 `HttpOnly` 쿠키로 발급한다.
5. 클라이언트는 Access Token으로 보호 API를 호출한다.

### 7.2 세션 복구
1. 앱은 저장된 Access Token으로 먼저 세션을 복구한다.
2. 실패하면 `/api/v1/auth/refresh`를 호출한다.
3. 유효한 Refresh Token이 있으면 새 Access Token을 발급한다.
4. 둘 다 실패하면 비로그인 상태로 전환한다.

### 7.3 보호 API
1. 클라이언트는 `Authorization: Bearer <accessToken>`을 보낸다.
2. 앱 서버는 Auth Server `/auth/verify`로 토큰을 검증한다.
3. 검증된 사용자 기준으로 앱 로컬 `User`를 찾거나 생성한다.

### 7.4 로그아웃
1. 클라이언트가 `auth-server /auth/logout`을 호출한다.
2. Auth Server가 Refresh Token을 폐기하고 쿠키를 제거한다.
3. Access Token은 짧은 만료 시간으로 자연 소멸한다.

### 7.5 OAuth
1. 클라이언트가 `auth-server /auth/provider/:provider`로 이동한다.
2. 공급자 인증 후 `auth-server /auth/callback/:provider`가 호출된다.
3. Auth Server가 provider profile을 기준으로 계정을 찾거나 생성한다.
4. Access/Refresh Token을 발급한다.
5. 현재 구현은 `redirectUri?accessToken=...` 방식으로 앱의 `/login/callback`으로 복귀한다.

## 8. 배포 구조
### 8.1 컨테이너
- `timetable-web`
- `workspace-auth-server`

### 8.2 데이터베이스 연결
- 운영 MariaDB는 OCI 호스트 OS에서 직접 동작한다.
- Docker 컨테이너에서는 `host.docker.internal`을 통해 호스트 DB에 접속한다.
- 현재 운영 규칙:
  - 앱 DB -> `timetable_db`
  - 인증 DB -> `workspace_auth`

## 9. 모듈 워크스페이스 흐름
### 9.1 사이드바 구성
- 기본 활성 모듈은 `live` 상태 모듈만 노출한다.
- 각 모듈 항목은 제거 버튼(`X`)을 가진다.
- 사이드바 하단 `+` 버튼으로 모듈 추가 모달을 연다.
- 추가 모달은 구현 상태(`live`/`planned`)와 저장소 계획을 함께 표시한다.

### 9.2 사용자별 모듈 구성 저장
1. 클라이언트는 `/api/modules`로 현재 활성 모듈 목록을 조회한다.
2. 서버는 인증된 앱 사용자를 기준으로 `WorkspaceModulePreference`를 읽는다.
3. 저장된 구성이 없으면 기본 모듈(`timetable`, `mypage`)을 초기화한다.
4. 사용자가 모듈을 추가/제거하면 서버가 같은 테이블을 갱신한다.

## 10. 현재 운영 상태
- 앱/인증 서버 분리 배포 완료
- `auth.workspace.p-e.kr` HTTPS 적용 완료
- Auth Server CORS 이슈 해결 완료
- 일반 로그인, 회원가입, Refresh, OAuth 브라우저 검증 완료
- 회원가입 프론트 validation 보강 완료
- 모듈 워크스페이스 셸 추가 완료
- 활성 모듈 구성을 서버 저장 방식으로 전환 완료
- `calendar` 모듈 실제 UI/API 구현 완료
- `tasks` 모듈 실제 UI/API 구현 완료
- 단일 app DB 구조는 더 이상 목표 구조가 아니라, 분리 리팩토링 전의 과도기 상태로 정의

## 11. 장기 과제
- OAuth callback의 query accessToken 전달을 one-time code 방식으로 전환
- Rate Limit 추가
- 감사 로그 추가
- `timetable_db.User.password` 제거
- 추가 서비스도 `authUserId` 기준으로 통일
- 모듈별 전용 DB와 Prisma 클라이언트 분리
- `workspace_core` 도입 후 공통 설정/프로필 데이터 이동

## 12. Multi-Schema Transition Status
- 현재 앱은 아직 하나의 app DB(`timetable_db`)를 migration 기준으로 사용한다.
- 하지만 runtime Prisma client는 아래 경계로 나누기 시작했다.
  - core: `lib/prisma/core.ts`
  - timetable: `lib/prisma/timetable.ts`
  - calendar: `lib/prisma/calendar.ts`
  - tasks: `lib/prisma/tasks.ts`
- generated client source는 `prisma/schemas/*.prisma`에 둔다.
- 전환 원칙:
  - migration/db push 기준은 아직 통합 [prisma/schema.prisma](/C:/workflow-management/prisma/schema.prisma) 하나로 유지
  - runtime query 경계는 도메인별 client로 먼저 분리
  - physical database split은 `tasks -> calendar -> workspace_core/profile` 순서로 진행
