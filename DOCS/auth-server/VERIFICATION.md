# 검증 방법

## 1. 목적
- 이 문서는 `auth-server`를 로컬 또는 서버에서 검증하는 절차를 정리한다.
- 검증은 수동 검증과 자동 검증 두 방식으로 나눈다.

## 2. 사전 준비

### 2.1 환경 변수 준비
1. [`.env.example`](C:\workflow-management\auth-server\.env.example)을 기준으로 `.env`를 만든다.
2. 최소 다음 값은 실제 환경에 맞게 채운다.
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `COOKIE_DOMAIN`
   - `CLIENT_ORIGINS`

### 2.2 의존성 설치
```bash
cd auth-server
npm install
```

### 2.3 Prisma 준비
```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 3. 서버 실행 검증

### 3.1 개발 서버 실행
```bash
npm run dev
```

### 3.2 헬스체크
```bash
curl http://localhost:4000/health
```

기대 결과:
```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 4. 수동 API 검증

### 4.1 회원가입
```bash
curl -X POST http://localhost:4000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\",\"name\":\"홍길동\"}"
```

확인 포인트:
- `201 Created`
- `success: true`
- `userId` 반환

### 4.2 로그인
```bash
curl -i -X POST http://localhost:4000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

확인 포인트:
- `200 OK`
- `accessToken` 반환
- `Set-Cookie: refreshToken=...` 포함

### 4.3 토큰 검증
1. 로그인 응답의 `accessToken`을 복사한다.
2. 아래 요청을 보낸다.

```bash
curl http://localhost:4000/api/v1/auth/verify ^
  -H "Authorization: Bearer ACCESS_TOKEN"
```

확인 포인트:
- `200 OK`
- `isValid: true`
- 사용자 정보 반환

### 4.4 토큰 재발급
1. 로그인 시 받은 `refreshToken` 쿠키를 유지한다.
2. 아래 요청을 보낸다.

```bash
curl -i -X POST http://localhost:4000/api/v1/auth/refresh ^
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

확인 포인트:
- `200 OK`
- 새 `accessToken` 반환
- 새 `Set-Cookie: refreshToken=...` 포함

### 4.5 로그아웃
```bash
curl -i -X POST http://localhost:4000/api/v1/auth/logout ^
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

확인 포인트:
- `200 OK`
- `success: true`
- `Set-Cookie: refreshToken=; Max-Age=0` 또는 만료 처리 포함

## 5. 자동 검증

### 5.1 테스트 실행
```bash
npm run test:run
```

### 5.2 포함된 테스트 범위
- 헬스체크 응답
- 회원가입 API 성공/실패
- 로그인 API와 Refresh Token 쿠키 발급
- Refresh API 쿠키 누락/성공 케이스
- Verify API Bearer 토큰 검증 경로
- Logout API 쿠키 제거
- Auth Service의 중복 가입, 로그인 실패, 토큰 발급 위임, 로그아웃 위임

## 6. 운영 전 체크리스트
- Reverse Proxy가 `X-Forwarded-*` 헤더를 올바르게 전달하는지 확인
- `COOKIE_SECURE=true` 환경에서 HTTPS로만 쿠키가 내려가는지 확인
- `SameSite=None` 환경에서 브라우저가 쿠키를 차단하지 않는지 확인
- 스테이징 도메인에서 서브도메인 간 쿠키 공유가 되는지 확인
- 만료된 Refresh Token이 재사용되지 않는지 확인

## 7. 현재 한계
- OAuth 공급자 연동은 아직 미구현 상태다.
- DB를 포함한 통합 테스트는 아직 추가하지 않았다.
- Rate Limit, 감사 로그, Redis 세션 저장소는 아직 반영하지 않았다.
