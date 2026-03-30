# auth-server

중앙 인증 서버 초안이 아니라, 현재는 로컬 인증 기본 흐름과 OAuth 진입점까지 포함한 실제 실행 가능한 서버 구조다.

## 현재 구현 범위
- 로컬 회원가입
- 로컬 로그인
- Access Token 발급
- Refresh Token 발급 및 회전
- Access Token 검증
- 로그아웃
- 헬스체크
- OAuth provider redirect
- OAuth callback 기본 처리

## 폴더 구조
```text
auth-server/
+-- prisma/
|   `-- schema.prisma
+-- src/
|   +-- config/
|   +-- controllers/
|   +-- lib/
|   +-- middlewares/
|   +-- repositories/
|   +-- routes/
|   +-- services/
|   +-- app.ts
|   `-- server.ts
+-- tests/
+-- .env.example
+-- Dockerfile
+-- package.json
`-- tsconfig.json
```

## 주요 계층
- `config/`
  - 환경 변수, 쿠키, OAuth 공급자 설정
- `controllers/`
  - HTTP 요청/응답 처리
- `services/`
  - 인증 비즈니스 로직
- `repositories/`
  - Prisma 접근
- `lib/`
  - JWT, 해시, OAuth state, Prisma 클라이언트
- `middlewares/`
  - 인증, 에러 핸들링, async wrapper

## 현재 인증 방식
### 로컬 인증
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/verify`
- `POST /api/v1/auth/logout`

### OAuth
- `GET /api/v1/auth/provider/:provider`
- `GET /api/v1/auth/callback/:provider`
- 지원 provider
  - Google
  - Kakao
  - GitHub

## OAuth 동작 방식
1. 클라이언트가 `redirectUri`와 함께 provider endpoint 호출
2. 서버가 서명된 `state`를 포함해 공급자 로그인 페이지로 리다이렉트
3. callback에서 code/state 검증
4. provider access token 교환
5. provider user profile 조회
6. 기존 OAuth 계정 또는 이메일 기반 사용자 연결
7. 서버 내부 Access/Refresh Token 발급
8. Refresh Token 쿠키 설정 후 클라이언트로 리다이렉트

현재 callback 응답은 `accessToken`을 query string으로 붙여 클라이언트로 돌려보낸다.

## 로컬 실행
```powershell
cd C:\workflow-management\auth-server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm start
```

## 필수 환경 변수
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `COOKIE_DOMAIN`
- `COOKIE_SECURE`
- `CLIENT_ORIGINS`

## OAuth 환경 변수
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`

## 테스트
```powershell
cd C:\workflow-management\auth-server
npm run test:run
npm run build
```

## 남은 작업
- OAuth 실제 공급자 콘솔 설정 후 연동 검증
- Rate Limit
- 감사 로그
- 운영 배포 워크플로 정리
- callback accessToken 전달 방식 개선 여부 검토
