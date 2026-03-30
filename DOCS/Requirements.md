# 요구사항 정의서

## 1. 문서 목적
- 현재 Next.js 단일 애플리케이션에 결합되어 있던 인증 구조를 별도의 중앙 인증 서버로 분리한다.
- `*.workspace.p-e.kr` 하위 서비스가 공통으로 사용할 수 있는 SSO 기반 인증 구조를 구축한다.
- 현재 구현 상태와 남은 요구사항을 한 문서에서 추적할 수 있도록 정리한다.

## 2. 현재 환경

### 2.1 인프라
- Cloud Provider: OCI
- 서버 OS: Rocky Linux ARM64 (`aarch64`)
- 배포 방식: GitHub Actions -> Docker Hub -> OCI SSH Deploy
- 실행 방식: `docker pull`, `docker stop`, `docker rm`, `docker run`
- Reverse Proxy: 서브도메인별 Docker 컨테이너 포트 라우팅

### 2.2 현재 서비스 노드
- Auth Server: `auth.workspace.p-e.kr`
- Main Client: `app.workspace.p-e.kr`
- Additional Clients: `project1.workspace.p-e.kr` 외 추가 예정 서비스

### 2.3 현재 저장소 구조
```text
.
+-- .github/workflows/deploy.yml
+-- app/
|   +-- api/
|   |   +-- auth/[...nextauth]/route.ts
|   |   +-- auth/signup/route.ts
|   |   +-- timetable/route.ts
|   |   `-- user/route.ts
|   +-- login/page.tsx
|   +-- mypage/page.tsx
|   +-- signup/page.tsx
|   +-- Navbar.tsx
|   +-- Providers.tsx
|   +-- layout.tsx
|   `-- page.tsx
+-- auth-server/
|   +-- prisma/
|   +-- src/
|   +-- tests/
|   +-- Dockerfile
|   `-- package.json
+-- lib/
|   +-- auth-config.ts
|   +-- prisma.ts
|   `-- server-auth.ts
+-- prisma/schema.prisma
+-- Dockerfile
+-- package.json
+-- DOCS/
|   +-- API_SPEC.md
|   +-- DEPLOYMENT.md
|   +-- Requirements.md
|   `-- TODO.md
`-- README.md
```

## 3. 목표 아키텍처

### 3.1 목표
- 인증 발급, 토큰 재발급, 토큰 검증, 로그아웃, 향후 OAuth 연동 책임을 `auth-server`로 집중시킨다.
- 클라이언트 서비스는 더 이상 자체적으로 세션을 발급하지 않는다.
- 클라이언트 서비스는 Auth Server가 발급한 Access Token을 사용하고, 비즈니스 데이터만 관리한다.

### 3.2 토큰 전략
- Access Token: 짧은 수명의 JWT
- Refresh Token: 긴 수명의 서버 관리 토큰
- Refresh Token 전달 방식: `HttpOnly` 쿠키
- 운영 쿠키 도메인: `.workspace.p-e.kr`

### 3.3 인증 흐름
1. 사용자가 Auth Server에 로그인한다.
2. Auth Server가 Access Token과 Refresh Token을 발급한다.
3. Access Token은 클라이언트가 사용한다.
4. Refresh Token은 `HttpOnly` 쿠키로 저장한다.
5. 클라이언트는 Access Token 만료 시 Auth Server의 `/auth/refresh`로 재발급을 요청한다.
6. 클라이언트 API는 Access Token을 받아 Auth Server `/auth/verify`로 검증한다.

## 4. 현재 구현 상태

### 4.1 완료된 항목
- `auth-server` 프로젝트 생성 완료
- Express + TypeScript + Prisma 기반 인증 서버 구조 생성 완료
- 회원가입, 로그인, 토큰 재발급, 토큰 검증, 로그아웃 API 기본 구현 완료
- Refresh Token DB 저장 및 회전 구조 기본 구현 완료
- `auth-server` 테스트 작성 및 통과 완료
- `NextAuth` 기반 루트 앱 인증 제거 1차 완료
- 루트 앱 로그인/회원가입/로그아웃 UI를 Auth Server 기반으로 전환 완료
- 루트 앱의 `Providers.tsx`를 커스텀 Auth Context로 전환 완료
- 루트 앱의 일부 보호 API를 Bearer Token 기반으로 전환 완료
- 루트 앱 배포 설정에서 `NEXTAUTH_*` 제거, `AUTH_SERVER_URL` 사용으로 변경 완료

### 4.2 현재 전환 방식
- 루트 앱은 Auth Server가 검증한 사용자를 기준으로 동작한다.
- [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts)는 Access Token을 Auth Server에 검증 요청한다.
- 검증 성공 시 루트 앱 로컬 DB `User`를 이메일 기준으로 `upsert`한다.
- 이 로컬 `User`는 시간표, 별명 등 기존 앱 도메인 데이터와의 호환을 위해 유지한다.

### 4.3 현재 전환 방식의 한계
- 현재 앱 도메인 사용자와 Auth Server 사용자를 이메일 기준으로 연결하고 있다.
- 장기적으로는 Auth Server의 사용자 ID를 루트 앱 도메인 모델과 명시적으로 연결하는 구조가 더 안전하다.
- 현재 방식은 빠른 전환을 위한 임시 호환 레이어다.

## 5. Auth Server 요구사항

### 5.1 필수 API
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/verify`
- `POST /api/v1/auth/logout`
- `GET /health`

### 5.2 향후 필수 API
- `GET /api/v1/auth/provider/:provider`
- `GET /api/v1/auth/callback/:provider`

### 5.3 인증 데이터 요구사항
- 사용자 고유 ID
- 이메일
- 비밀번호 해시
- 표시 이름
- 역할(Role)
- OAuth 계정 연결 정보
- Refresh Token 저장 정보
- 생성/수정 시각

### 5.4 보안 요구사항
- 운영 환경 전체 HTTPS 사용
- Refresh Token 쿠키에 `HttpOnly`, `Secure`, 적절한 `SameSite`, `Domain=.workspace.p-e.kr` 적용
- Access Token 만료 시간은 짧게 유지
- Refresh Token은 회전 및 폐기 가능해야 함
- JWT `iss`, `aud`, `exp`, 서명 검증 필수
- 비밀번호는 해시 저장
- 민감한 비밀값은 환경 변수 또는 CI/CD 시크릿으로만 관리
- 로그인, 회원가입, Refresh, Verify 경로에 Rate Limit 도입 필요

## 6. 클라이언트 앱 요구사항

### 6.1 인증 책임 제거
- 클라이언트는 더 이상 자체 세션 발급을 하지 않는다.
- `next-auth` 의존을 제거한다.
- 로컬 회원가입 API는 제거하거나 폐기 상태로 유지한다.

### 6.2 클라이언트 인증 동작
- 로그인은 Auth Server `/auth/login`을 호출한다.
- 회원가입은 Auth Server `/auth/register`를 호출한다.
- 로그아웃은 Auth Server `/auth/logout`을 호출한다.
- 앱 시작 시 저장된 Access Token 검증 -> 실패 시 Refresh 시도 순으로 세션을 복구한다.
- 보호 API 호출 시 `Authorization: Bearer <accessToken>` 헤더를 사용한다.

### 6.3 루트 앱 데이터 API 요구사항
- 시간표 API는 더 이상 클라이언트가 전달한 `userId`를 신뢰하지 않는다.
- 서버가 Access Token 검증 후 로컬 앱 사용자 ID를 직접 결정한다.
- 별명 수정 API는 인증된 사용자만 접근 가능해야 한다.

## 7. 배포 요구사항

### 7.1 Auth Server
- ARM64 대상 Docker 이미지 빌드 지원
- OCI 배포 가능
- 운영용 `.env` 또는 시크릿 주입 가능

### 7.2 Root App
- 빌드 시 `AUTH_SERVER_URL`과 `NEXT_PUBLIC_AUTH_SERVER_URL` 주입 가능해야 함
- 런타임에도 `AUTH_SERVER_URL`을 사용할 수 있어야 함
- 기존 `NEXTAUTH_SECRET`, `NEXTAUTH_URL` 의존 제거

### 7.3 Reverse Proxy
- `auth.workspace.p-e.kr` -> Auth Server
- `app.workspace.p-e.kr` -> Root App
- 추후 서비스 추가 시 동일 인증 서버 재사용 가능해야 함

## 8. 테스트 및 검증 요구사항

### 8.1 완료된 검증
- `auth-server` 단위 테스트 통과
- `auth-server` 라우트 테스트 통과
- `auth-server` 빌드 통과
- 루트 Next.js 앱 빌드 통과
- 로컬 수동 검증에서 `register`, `login`, `refresh`, `logout` 성공 확인

### 8.2 남은 검증
- `verify` 포함 전체 수동 시나리오 정리
- 루트 앱과 Auth Server의 실제 브라우저 연동 검증
- 서브도메인 쿠키 동작 검증
- 운영 Reverse Proxy 환경 검증
- OAuth 공급자 연동 후 end-to-end 검증

## 9. 비범위 항목
- MFA
- SAML
- 관리자 콘솔
- 고급 RBAC 정책 UI
- 멀티 리전 배포

## 10. 완료 조건
- `auth-server`가 운영 환경에서 배포 가능 상태일 것
- 루트 앱이 `next-auth` 없이 중앙 인증으로 동작할 것
- 루트 앱의 보호 API가 중앙 인증 검증 기반으로 동작할 것
- 배포 파이프라인이 `AUTH_SERVER_URL` 기준으로 정리될 것
- OAuth를 제외한 로컬 인증 기본 흐름이 end-to-end로 동작할 것
