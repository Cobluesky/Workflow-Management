# API 명세서

## 1. 개요
- 이 문서는 중앙 인증 서버 `auth.workspace.p-e.kr`의 현재 구현 기준 API 계약을 정리한다.
- Base URL은 `https://auth.workspace.p-e.kr/api/v1` 이다.
- 모든 응답은 기본적으로 `application/json` 형식을 사용한다.

## 2. 공통 규칙

### 2.1 공통 헤더
- 요청 바디가 있는 경우 `Content-Type: application/json`
- 보호 API는 `Authorization: Bearer <accessToken>` 사용

### 2.2 공통 응답 형식
```json
{
  "success": true,
  "data": {},
  "message": "optional message"
}
```

### 2.3 공통 에러 형식
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### 2.4 Refresh Token 쿠키
- 쿠키 이름: `refreshToken`
- 권장 속성
  - `HttpOnly`
  - `Secure`
  - 운영 환경에서 `SameSite=None`
  - `Domain=.workspace.p-e.kr`
  - `Path=/`

## 3. 인증 API

### 3.1 회원가입
`POST /auth/register`

요청:
```json
{
  "email": "user@example.com",
  "password": "plain-password",
  "name": "홍길동"
}
```

성공 응답:
`201 Created`

```json
{
  "success": true,
  "data": {
    "userId": "clx123abc",
    "message": "User created successfully"
  }
}
```

실패 예시:
- `400 Bad Request`: 요청 형식 오류
- `409 Conflict`: 이미 가입된 이메일

### 3.2 로그인
`POST /auth/login`

요청:
```json
{
  "email": "user@example.com",
  "password": "plain-password"
}
```

성공 응답:
`200 OK`

헤더:
```http
Set-Cookie: refreshToken=...; HttpOnly; Secure; Domain=.workspace.p-e.kr; Path=/
```

바디:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "user": {
      "id": "clx123abc",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "USER"
    }
  }
}
```

실패 예시:
- `400 Bad Request`: 요청 형식 오류
- `401 Unauthorized`: 이메일 또는 비밀번호 불일치

### 3.3 OAuth 로그인 시작
`GET /auth/provider/:provider`

Path Parameter:
- `provider`: `google` | `kakao` | `github`

Query Parameter:
- `redirectUri`: 로그인 완료 후 돌아갈 클라이언트 URL

성공 응답:
`302 Found`

- 각 OAuth 공급자 로그인 페이지로 리다이렉트
- `state`에는 provider와 redirectUri가 서명되어 포함됨

### 3.4 OAuth callback
`GET /auth/callback/:provider`

Path Parameter:
- `provider`: `google` | `kakao` | `github`

Query Parameter:
- `code`: OAuth Authorization Code
- `state`: 서명된 상태값

성공 응답:
`302 Found`

- Refresh Token 쿠키 설정
- 클라이언트 `redirectUri`로 리다이렉트
- 현재 구현에서는 `accessToken`을 query string으로 전달
  - 예: `https://app.workspace.p-e.kr?accessToken=...`

실패 예시:
- `400 Bad Request`: code/state 누락 또는 state 검증 실패
- `404 Not Found`: 지원하지 않는 provider
- `500 Internal Server Error`: provider 설정 누락
- `502 Bad Gateway`: provider 토큰 교환 또는 프로필 조회 실패

### 3.5 토큰 재발급
`POST /auth/refresh`

요청:
- 바디 없음
- `refreshToken` 쿠키 필요

성공 응답:
`200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

실패 예시:
- `401 Unauthorized`: Refresh Token 없음
- `403 Forbidden`: Refresh Token 무효 또는 폐기됨

### 3.6 토큰 검증
`GET /auth/verify`

요청 헤더:
```http
Authorization: Bearer <accessToken>
```

성공 응답:
`200 OK`

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "user": {
      "id": "clx123abc",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "USER"
    }
  }
}
```

실패 예시:
- `401 Unauthorized`: 토큰 없음 또는 형식 오류
- `403 Forbidden`: 만료, 서명 불일치, 비활성 사용자

### 3.7 로그아웃
`POST /auth/logout`

성공 응답:
`200 OK`

헤더:
```http
Set-Cookie: refreshToken=; Max-Age=0; Domain=.workspace.p-e.kr; Path=/
```

바디:
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## 4. 운영 API

### 4.1 헬스체크
`GET /health`

성공 응답:
`200 OK`

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 5. JWT Claim
```json
{
  "sub": "clx123abc",
  "email": "user@example.com",
  "name": "홍길동",
  "role": "USER",
  "iss": "https://auth.workspace.p-e.kr",
  "aud": "workspace-clients"
}
```

## 6. 현재 구현 메모
- 로컬 인증은 구현 완료
- OAuth는 Google/Kakao/GitHub 공통 흐름 코드가 추가된 상태
- 실제 연동 성공 여부는 각 공급자 콘솔 설정과 환경 변수 입력 후 검증 필요
- 현재 OAuth callback은 Access Token을 query string으로 전달한다
- 장기적으로는 전용 callback 페이지 또는 one-time code 방식으로 개선 가능
