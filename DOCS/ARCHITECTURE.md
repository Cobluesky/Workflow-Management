# 아키텍처 설계서

## 1. 문서 목적
- 중앙 인증 서버 분리 이후의 기준 아키텍처를 정의한다.
- 현재 구현 상태와 목표 구조를 구분해서 기록한다.
- 이후 `TODO`, `API_SPEC`, 배포 문서가 참조할 단일 설계 기준을 제공한다.

## 2. 설계 목표
- 인증 책임을 각 서비스에서 제거하고 `auth-server`에 집중시킨다.
- 비즈니스 서비스는 자체 비밀번호를 저장하지 않고, 인증 결과만 신뢰한다.
- 향후 `project1`, 추가 마이크로서비스가 같은 인증 서버를 재사용할 수 있어야 한다.
- 전역 사용자 식별자는 Auth Server가 소유하고, 각 서비스는 이를 기준으로 로컬 프로필을 투영한다.

## 3. 시스템 컨텍스트

### 3.1 서비스 노드
- `auth.workspace.p-e.kr`
  - 중앙 인증 서버
  - 로그인, 회원가입, 토큰 발급/재발급/검증, 로그아웃, OAuth 연동 담당
- `app.workspace.p-e.kr`
  - 시간표 메인 서비스
  - 시간표, 별명, 앱 도메인 데이터 담당
- `project1.workspace.p-e.kr`
  - 향후 동일한 인증 서버를 사용하는 별도 서비스

### 3.2 운영 토폴로지
- Reverse Proxy: Nginx
- `auth.workspace.p-e.kr -> workspace-auth-server:4000`
- `app.workspace.p-e.kr -> timetable-web:3000`
- 현재 OCI 운영 환경에서는 MariaDB가 호스트 OS에서 실행 중이며, Docker 컨테이너는 호스트 DB에 연결한다.

## 4. 책임 분리 원칙

### 4.1 Auth Server 책임
- 로컬 계정 생성
- 비밀번호 해시 저장 및 검증
- OAuth 공급자 계정 연결
- Access Token 발급
- Refresh Token 저장, 회전, 폐기
- Access Token 검증
- 전역 사용자 식별자 관리

### 4.2 Client Service 책임
- 인증 서버가 검증한 사용자를 기준으로 비즈니스 로직 수행
- 서비스별 사용자 프로필 유지
- 서비스별 데이터 저장
- 보호 API에서 Access Token을 전달하고, 필요 시 인증 서버에 검증 위임

### 4.3 금지할 구조
- 각 서비스가 자체 비밀번호를 진실 원본으로 유지하는 구조
- 서비스 간 직접 사용자 비밀번호 공유
- 클라이언트가 전달한 `userId`를 그대로 신뢰하는 구조

## 5. 데이터 소유권

### 5.1 Auth DB: `workspace_auth`
- 인증 도메인의 단일 진실 원본
- 주요 데이터
  - `User`
  - `OAuthAccount`
  - `RefreshToken`

### 5.2 App DB: `timetable_db`
- 시간표 앱 전용 도메인 데이터 저장소
- 주요 데이터
  - `User`
  - `Lesson`

### 5.3 데이터 소유권 규칙
- `workspace_auth.User`
  - 이메일
  - 비밀번호 해시
  - 전역 사용자 ID
  - 역할
  - 활성 상태
- `timetable_db.User`
  - 시간표 앱 내부 사용자 프로필
  - 별명
  - 시간표 소유자 식별
- 장기적으로 `timetable_db.User.password`는 제거 대상이다.
- 장기적으로 각 서비스 DB는 `authUserId`를 통해 Auth Server 사용자와 연결한다.

## 6. 사용자 식별 전략

### 6.1 목표 식별자
- 전역 사용자 식별자는 `workspace_auth.User.id`이다.
- 모든 서비스는 궁극적으로 이 값을 사용자 연결 키로 사용한다.

### 6.2 현재 전환 상태
- 현재 루트 앱은 [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 에서 Access Token 검증 후 이메일 기준으로 로컬 `User`를 `upsert`한다.
- 이는 빠른 전환을 위한 호환 레이어다.

### 6.3 목표 전환 상태
- 각 서비스 DB `User` 또는 대응 프로필 테이블에 `authUserId`를 추가한다.
- 토큰 검증 결과의 `authUser.id`를 기준으로 로컬 사용자를 조회하거나 생성한다.
- 이메일은 식별자 대신 동기화 필드로 사용한다.

### 6.4 이유
- 이메일 변경 가능성에 대비할 수 있다.
- OAuth 공급자 변경, 추가 서비스 도입 시 연결 안정성이 높아진다.
- 서비스 간 사용자 매핑 규칙이 일관된다.

## 7. 인증 흐름

### 7.1 로컬 로그인
1. 사용자가 `auth-server`에 이메일/비밀번호를 전송한다.
2. `auth-server`가 `workspace_auth`에서 사용자와 비밀번호 해시를 검증한다.
3. 성공 시 Access Token을 응답 바디로 반환한다.
4. Refresh Token은 `HttpOnly` 쿠키로 발급한다.
5. 클라이언트 서비스는 Access Token으로 보호 API를 호출한다.

### 7.2 세션 복구
1. 클라이언트가 저장된 Access Token으로 동작을 시작한다.
2. Access Token 검증 실패 시 `/api/v1/auth/refresh`를 호출한다.
3. 유효한 Refresh Token이 있으면 새 Access Token을 재발급한다.
4. 재발급도 실패하면 비로그인 상태로 전환한다.

### 7.3 보호 API
1. 클라이언트는 `Authorization: Bearer <accessToken>`을 보낸다.
2. 서비스 서버는 토큰을 직접 신뢰하지 않고 `auth-server /auth/verify`로 검증한다.
3. 검증된 사용자 기준으로 서비스 로컬 사용자와 도메인 데이터를 조회한다.

### 7.4 로그아웃
1. 클라이언트가 `auth-server /auth/logout`을 호출한다.
2. 인증 서버는 Refresh Token을 폐기하고 쿠키를 삭제한다.
3. Access Token은 짧은 만료 시간으로 자연 소멸시킨다.

### 7.5 OAuth
1. 클라이언트가 `auth-server /auth/provider/:provider`로 이동한다.
2. 공급자 인증 후 `auth-server /auth/callback/:provider`가 호출된다.
3. `auth-server`는 공급자 프로필로 사용자를 찾거나 생성한다.
4. Access Token과 Refresh Token을 발급한다.
5. 현재 구현은 `redirectUri?accessToken=...` 방식으로 클라이언트에 복귀한다.
6. 장기적으로는 one-time code 교환 방식으로 전환하는 것이 바람직하다.

## 8. 현재 구조와 목표 구조

### 8.1 현재 구조
- 인증 원본 데이터가 아직 `timetable_db.User.password`에 남아 있다.
- `workspace_auth` DB는 분리 대상으로 설계되었으나 운영 구성이 완료되지 않았다.
- 루트 앱은 이메일 기준 `upsert`로만 로컬 사용자와 인증 사용자를 연결한다.

### 8.2 목표 구조
- 사용자 인증 원본은 `workspace_auth`로 완전히 이전한다.
- `timetable_db`는 시간표 앱 도메인 데이터만 유지한다.
- 서비스별 프로필은 `authUserId`로 Auth Server 사용자와 연결한다.

## 9. 마이그레이션 전략

### 9.1 1단계: Auth DB 준비
- `workspace_auth` 데이터베이스 생성
- Auth Server Prisma 마이그레이션 적용
- Auth 전용 DB 사용자와 권한 구성

### 9.2 2단계: 기존 계정 이관
- `timetable_db.User`의 기존 계정 데이터를 분석한다.
- 기존 `password` 해시를 `workspace_auth.User.passwordHash`로 이관한다.
- 기존 이메일을 기준으로 Auth Server 사용자 레코드를 생성한다.
- `name`은 임시 규칙 또는 별도 마이그레이션 정책으로 채운다.

### 9.3 3단계: 서비스 연결키 전환
- `timetable_db.User`에 `authUserId` 컬럼 추가
- 이메일 기반 연결 대신 `authUserId` 기반 연결로 전환
- `lib/server-auth.ts`의 이메일 `upsert` 호환 레이어를 축소

### 9.4 4단계: 레거시 인증 제거
- `timetable_db.User.password` 사용 중단
- 앱 DB의 인증 책임 제거
- 필요한 경우 해당 컬럼 제거 또는 완전 비활성화

### 9.5 5단계: 추가 서비스 확장
- `project1` 등 신규 서비스에 동일한 패턴 적용
- 신규 서비스는 처음부터 `authUserId` 기준으로 설계

## 10. 배포 아키텍처

### 10.1 컨테이너 구성
- `timetable-web`
  - Next.js 앱
  - 내부 포트 `3000`
- `workspace-auth-server`
  - 인증 서버
  - 내부 포트 `4000`

### 10.2 Reverse Proxy
- `app.workspace.p-e.kr`는 `127.0.0.1:3000`으로 프록시
- `auth.workspace.p-e.kr`는 `127.0.0.1:4000`으로 프록시

### 10.3 데이터베이스 연결
- 현재 운영 환경의 MariaDB는 호스트 OS에서 동작한다.
- Docker 컨테이너에서 호스트 DB를 사용할 때는 `localhost` 대신 호스트 주소를 사용해야 한다.
- 현재 운영 구조에서는 `host.docker.internal` 기반 연결을 표준으로 본다.
- 장기적으로는 Managed DB 또는 DB 컨테이너 네트워크 구조로 명확히 분리하는 것이 바람직하다.

## 11. 보안 원칙
- 운영 전체 구간 HTTPS 사용
- Refresh Token은 `HttpOnly`, `Secure`, `SameSite=None`, 적절한 `Domain` 사용
- Access Token은 짧은 만료 시간을 유지
- Refresh Token은 서버 저장소 기준으로 회전 및 폐기
- JWT `iss`, `aud`, `exp`, 서명 검증 필수
- OAuth `state` 검증 필수
- 민감한 설정값은 GitHub Secret 또는 서버 env 파일로만 관리

## 12. 향후 모듈화 기준
- 각 신규 서비스는 인증 정보를 직접 저장하지 않는다.
- 각 신규 서비스는 최소한의 로컬 사용자 프로필만 가진다.
- 공통 사용자 속성이 늘어나면 Auth Server 또는 별도 User Profile 서비스로 책임을 모은다.
- 서비스 간 동기화 기준은 이메일이 아니라 전역 사용자 ID다.

## 13. 설계 결정 요약
- 인증의 진실 원본은 `workspace_auth`
- 시간표 앱은 인증이 아니라 도메인 데이터에 집중
- 현재 이메일 기반 연결은 임시 호환 레이어
- 장기 목표 연결키는 `authUserId`
- OAuth는 중앙 인증 서버에서만 처리
- 서비스 추가 시 동일 패턴을 재사용
