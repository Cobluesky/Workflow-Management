# 운영 배포 가이드

이 문서는 현재 OCI 운영 환경 기준의 배포 구조, 환경 변수 규칙, Nginx 프록시 구성, 점검 절차를 정리한다.

## 현재 운영 구성
- `app.workspace.p-e.kr` -> `timetable-web` -> `127.0.0.1:3000`
- `auth.workspace.p-e.kr` -> `workspace-auth-server` -> `127.0.0.1:4000`
- 공개 포트는 `80`, `443`만 사용한다.
- MariaDB는 OCI 호스트 OS에서 직접 동작한다.
- Docker 컨테이너에서는 호스트 DB에 `host.docker.internal`로 접속한다.

## GitHub Actions 배포 흐름
- 루트 앱 이미지는 `timetable-web:latest`로 빌드한다.
- 인증 서버 이미지는 `workspace-auth-server:latest`로 빌드한다.
- 인증 서버 배포 시:
  - 서버에 `workspace-auth-server.env`를 생성한다.
  - one-off 컨테이너로 `prisma migrate deploy`를 먼저 실행한다.
  - migration 성공 후 기존 `workspace-auth-server` 컨테이너를 교체한다.
- 앱 배포 시:
  - 서버에 `timetable-web.env`를 생성한다.
  - 기존 `timetable-web` 컨테이너를 교체한다.

## GitHub Secrets
### 공통
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`

### env 파일 전체를 저장하는 secret
- `APP_ENV_FILE`
- `AUTH_ENV_FILE`

중요:
- 현재 배포는 개별 key-value secret이 아니라 env 파일 전체를 멀티라인 secret으로 저장하는 방식이다.
- `docker run --env-file`을 사용하므로 값은 `KEY=value` 형식으로 넣는다.
- 운영 env 값에는 바깥따옴표를 넣지 않는다.

## 운영 env 예시
### APP_ENV_FILE
```env
DATABASE_URL=mysql://timetable_user:app_password@host.docker.internal:3306/timetable_db
WORKSPACE_CORE_DATABASE_URL=mysql://workspace_core_user:workspace_core_password@host.docker.internal:3306/workspace_core
CALENDAR_DATABASE_URL=mysql://calendar_user:calendar_password@host.docker.internal:3306/calendar_db
TASKS_DATABASE_URL=mysql://tasks_user:tasks_password@host.docker.internal:3306/tasks_db
AUTH_SERVER_URL=https://auth.workspace.p-e.kr
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.workspace.p-e.kr
```

### AUTH_ENV_FILE
```env
PORT=4000
NODE_ENV=production
DATABASE_URL=mysql://workspace_auth_user:auth_password@host.docker.internal:3306/workspace_auth
JWT_ACCESS_SECRET=replace-with-strong-access-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret
JWT_ISSUER=https://auth.workspace.p-e.kr
JWT_AUDIENCE=workspace-clients
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_DOMAIN=.workspace.p-e.kr
COOKIE_SECURE=true
CLIENT_ORIGINS=https://app.workspace.p-e.kr,https://project1.workspace.p-e.kr
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://auth.workspace.p-e.kr/api/v1/auth/callback/google
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_CALLBACK_URL=https://auth.workspace.p-e.kr/api/v1/auth/callback/kakao
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://auth.workspace.p-e.kr/api/v1/auth/callback/github
```

## Nginx
- 예시 파일: `../deploy/nginx/workspace.p-e.kr.conf.example`
- 운영에서는 Certbot이 발급한 실제 인증서 경로를 사용한다.
- 현재 기준으로 `auth.workspace.p-e.kr`와 `app.workspace.p-e.kr`는 각각 별도 인증서를 사용한다.

## 운영 점검 명령
```bash
docker ps
docker logs workspace-auth-server --tail 100
docker logs timetable-web --tail 100
curl -i http://127.0.0.1:4000/health
curl -i https://auth.workspace.p-e.kr/health
curl -I https://app.workspace.p-e.kr
```

## CORS 점검
Auth Server CORS가 정상인지 확인하려면:

```bash
curl -i -X OPTIONS "https://auth.workspace.p-e.kr/api/v1/auth/refresh" \
  -H "Origin: https://app.workspace.p-e.kr" \
  -H "Access-Control-Request-Method: POST"
```

정상이라면 아래 헤더가 포함되어야 한다.
- `Access-Control-Allow-Origin: https://app.workspace.p-e.kr`
- `Access-Control-Allow-Credentials: true`

## 현재 운영 확인 상태
- `workspace-auth-server` 기동 확인 완료
- `timetable-web` 기동 확인 완료
- `auth.workspace.p-e.kr` HTTPS 및 인증서 정상 확인 완료
- `auth.workspace.p-e.kr/health` 응답 확인 완료
- Auth Server CORS preflight 정상 확인 완료
- 일반 로그인, 회원가입, OAuth 로그인 브라우저 검증 완료
