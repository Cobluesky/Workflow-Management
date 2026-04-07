# API 스펙

## 공통 규칙
- 보호 API는 `Authorization: Bearer <accessToken>`을 사용한다.
- 브라우저 클라이언트는 refresh cookie를 위해 `credentials: include`를 사용한다.
- auth 관련 브라우저 요청은 CORS 허용 origin 안에서만 동작한다.

## Auth Server API
Base URL: `https://auth.workspace.p-e.kr/api/v1`

### `POST /auth/register`
- 회원가입
- 입력 검증
  - `email`: 유효한 이메일 형식
  - `password`: 최소 8자
  - `name`: 1자 이상 50자 이하

### `POST /auth/login`
- 일반 로그인
- 성공 시 access token 반환
- refresh token cookie 설정

### `POST /auth/refresh`
- refresh cookie 기준으로 access token 재발급
- 로그아웃 상태에서는 `401`이 정상일 수 있다.

### `GET /auth/verify`
- access token 검증
- 앱 서버의 보호 API가 이 엔드포인트를 사용한다.

### `POST /auth/logout`
- refresh token 무효화
- refresh cookie 제거

### `GET /auth/provider/:provider`
- OAuth 시작
- `google`, `github`, `kakao`

### `GET /auth/callback/:provider`
- OAuth callback 처리
- 현재 구현은 callback 이후 `accessToken` query redirect를 사용한다.

## App API
Base URL: `https://app.workspace.p-e.kr`

### `GET /api/user`
- 현재 사용자 프로필 조회
- 주 저장소: `workspace_core.WorkspaceProfile`
- `workspace_core` 장애 시 legacy alias fallback 가능

응답 예시:
```json
{
  "success": true,
  "data": {
    "alias": "gimlet"
  }
}
```

### `PATCH /api/user`
- 현재 사용자 alias 수정
- 주 저장소: `workspace_core.WorkspaceProfile`
- core 미준비 시 legacy alias 경로로 fallback

### `GET /api/modules`
- 활성 모듈 목록 조회
- 저장소: `workspace_core.WorkspaceModulePreference`, `WorkspaceModuleState`
- 기본 모듈: `timetable`, `mypage`
- core 미준비 시 `persisted: false`와 함께 fallback 응답 반환

응답 예시:
```json
{
  "success": true,
  "data": {
    "enabledModuleIds": ["timetable", "mypage"],
    "persisted": true
  }
}
```

### `PATCH /api/modules`
- 활성 모듈 목록 저장
- core 미준비 시 `persisted: false`를 반환하고, 클라이언트는 로컬 캐시를 유지한 뒤 복구 후 재전송한다.

### `GET /api/timetable`
- 시간표 조회
- 저장소: `timetable_db`

### `POST /api/timetable`
- 시간표 저장
- 저장소: `timetable_db`

### `GET /api/calendar?month=YYYY-MM`
- 월 단위 일정 조회
- 저장소: `calendar_db`
- 월 경계 일정 누락을 막기 위해 조회 범위를 넓혀서 읽는다.

### `POST /api/calendar`
### `PATCH /api/calendar`
### `DELETE /api/calendar`
- 캘린더 일정 CRUD
- 저장소: `calendar_db`
- 소유 키: `authUserId`

### `GET /api/tasks`
### `POST /api/tasks`
### `PATCH /api/tasks`
### `DELETE /api/tasks`
- 할 일 CRUD
- 저장소: `tasks_db`
- 소유 키: `authUserId`

## Split 런타임 메모
- `workspace_core`, `calendar_db`, `tasks_db`는 운영에서 개별 DB URL이 필수다.
- 운영에서 split DB URL이 빠지면 deploy가 실패해야 한다.
- 로컬 개발에서만 `DATABASE_URL` fallback을 허용한다.
