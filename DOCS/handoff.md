# Handoff

## 현재 상태
- 브랜치: `dev`
- 작업트리: clean
- 최신 커밋
  - `26b0281` Add sanitized app env diagnostics
  - `f237768` Mount app build env as a secret file
  - `56fc494` Parse app build env file without shell sourcing
  - `254a4f2` Fix env-file parsing and optimize deploy workflow
  - `e5803ad` Use env files for production deployment
  - `74236ba` Document production proxy and deployment setup
  - `7708dd4` Slim Docker images and deploy auth server separately
  - `7b3400b` Introduce centralized auth server and app auth integration

## 완료된 큰 작업
- `next-auth` 제거 후 중앙 `auth-server` 기반 인증 구조로 전환
- `auth-server` 별도 서비스 구축
- OAuth 진입점/콜백 기본 구현
- 루트 앱과 `auth-server` 테스트 통과
- 앱/인증 서버 Dockerfile 분리
- GitHub Actions에서 앱/인증 서버 각각 배포하도록 정리
- 운영용 env 파일 기반 배포 구조로 전환

## 현재 막힌 지점
- GitHub Actions의 앱 이미지 빌드에서 `APP_ENV_FILE` secret 내용이 비어 있어서 빌드가 실패 중
- 최근 실패 로그 핵심:

```text
APP_ENV_FILE diagnostics: bytes=1, lines=2, parsedKeys=(none)
Missing build env keys: DATABASE_URL, AUTH_SERVER_URL, NEXT_PUBLIC_AUTH_SERVER_URL
```

- 이건 코드 문제가 아니라 `APP_ENV_FILE` GitHub Secret이 비어 있거나 공백만 들어간 상태라는 뜻

## 바로 해야 할 일
1. GitHub Actions Secrets에 `APP_ENV_FILE` 값 넣기
2. GitHub Actions Secrets에 `AUTH_ENV_FILE` 값 넣기
3. workflow 재실행
4. 배포 후 OCI에서 컨테이너 상태 확인

## GitHub Secrets에 넣을 값

### `APP_ENV_FILE`
예시 파일: `../deploy/env/timetable-web.env.example`

```env
DATABASE_URL="mysql://<app_db_user>:<app_db_password>@<app_db_host>:<app_db_port>/<app_db_name>"
AUTH_SERVER_URL="https://auth.workspace.p-e.kr"
NEXT_PUBLIC_AUTH_SERVER_URL="https://auth.workspace.p-e.kr"
```

### `AUTH_ENV_FILE`
예시 파일: `../deploy/env/workspace-auth-server.env.example`

```env
PORT=4000
NODE_ENV=production
DATABASE_URL="mysql://<auth_db_user>:<auth_db_password>@<auth_db_host>:<auth_db_port>/<auth_db_name>"
JWT_ACCESS_SECRET="<very_long_random_string>"
JWT_REFRESH_SECRET="<different_very_long_random_string>"
JWT_ISSUER="https://auth.workspace.p-e.kr"
JWT_AUDIENCE="workspace-clients"
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_DOMAIN=".workspace.p-e.kr"
COOKIE_SECURE=true
CLIENT_ORIGINS="https://app.workspace.p-e.kr,https://project1.workspace.p-e.kr"
GOOGLE_CLIENT_ID="<google_client_id>"
GOOGLE_CLIENT_SECRET="<google_client_secret>"
GOOGLE_CALLBACK_URL="https://auth.workspace.p-e.kr/api/v1/auth/callback/google"
KAKAO_CLIENT_ID="<kakao_client_id>"
KAKAO_CLIENT_SECRET="<kakao_client_secret>"
KAKAO_CALLBACK_URL="https://auth.workspace.p-e.kr/api/v1/auth/callback/kakao"
GITHUB_CLIENT_ID="<github_client_id>"
GITHUB_CLIENT_SECRET="<github_client_secret>"
GITHUB_CALLBACK_URL="https://auth.workspace.p-e.kr/api/v1/auth/callback/github"
```

## DB 크리덴셜 메모
- 앱 DB는 기존 배포에서 쓰던 `DATABASE_URL`을 재사용하는 게 가장 빠름
- OCI 서버에서 확인 가능:

```bash
docker inspect timetable-web --format='{{range .Config.Env}}{{println .}}{{end}}' | grep DATABASE_URL
```

- auth DB는 별도 DB/계정 생성 권장

## JWT secret 생성 메모
PowerShell에서:

```powershell
$access = -join ((48..57 + 65..70) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$refresh = -join ((48..57 + 65..70) | Get-Random -Count 64 | ForEach-Object {[char]$_})
"JWT_ACCESS_SECRET=""$access"""
"JWT_REFRESH_SECRET=""$refresh"""
```

## 관련 파일
- `.github/workflows/deploy.yml`
- `Dockerfile`
- `scripts/run-build-with-env-file.mjs`
- `../deploy/env/timetable-web.env.example`
- `../deploy/env/workspace-auth-server.env.example`
- `DEPLOYMENT.md`
- `../deploy/nginx/workspace.p-e.kr.conf.example`

## 배포 확인 명령
OCI 서버에서:

```bash
docker ps
docker logs workspace-auth-server --tail 100
docker logs timetable-web --tail 100
curl -i http://127.0.0.1:4000/health
```

## 집에서 이어갈 때
- 저장소만 가져가도 충분함: `C:\workflow-management`
- Codex 로컬 상태까지 옮기고 싶으면 같이 복사:
  - `%USERPROFILE%\.codex\sqlite\codex-dev.db`
  - `%USERPROFILE%\.codex\.codex-global-state.json`
- 다만 세션 완전 복원은 보장되지 않음

## 한 줄 요약
- 코드 쪽 큰 작업은 끝났고, 지금 막힌 건 `APP_ENV_FILE` / `AUTH_ENV_FILE` GitHub Secrets를 실제 값으로 채우는 배포 설정 문제다.
