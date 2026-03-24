# 운영 배포 가이드

이 문서는 현재 저장소 기준 운영 배포 구조와 Nginx 리버스 프록시 설정 포인트를 정리한다.

## 목표 구성
- `app.workspace.p-e.kr` -> `timetable-web` 컨테이너 -> `127.0.0.1:3000`
- `auth.workspace.p-e.kr` -> `workspace-auth-server` 컨테이너 -> `127.0.0.1:4000`
- 외부 공개 포트는 `80`, `443`만 사용
- `3000`, `4000`은 호스트 로컬 루프백에만 바인딩

## GitHub Actions 동작
- 루트 앱 이미지는 `timetable-web:latest`
- 인증 서버 이미지는 `workspace-auth-server:latest`
- workflow는 `auth-server`를 먼저 배포한 뒤 앱을 배포

## GitHub Secrets
### 공통
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`

### 앱
- `DATABASE_URL`
- `AUTH_SERVER_URL`

### auth-server
- `AUTH_DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `COOKIE_DOMAIN`
- `CLIENT_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`

## Nginx 설정
- 예시 파일: `deploy/nginx/workspace.p-e.kr.conf.example`
- 인증서 경로는 실제 Certbot 또는 운영 경로로 교체
- `proxy_pass` 대상은 둘 다 `127.0.0.1`

## 배포 후 확인
```bash
docker ps
docker logs workspace-auth-server --tail 100
docker logs timetable-web --tail 100
curl -i http://127.0.0.1:4000/health
curl -I https://auth.workspace.p-e.kr
curl -I https://app.workspace.p-e.kr
```

## 정상 상태 기준
- `workspace-auth-server`가 `Up`
- `timetable-web`가 `Up`
- `http://127.0.0.1:4000/health`가 `200`
- `https://auth.workspace.p-e.kr`가 Nginx를 통해 `4000`으로 전달
- `https://app.workspace.p-e.kr`가 Nginx를 통해 `3000`으로 전달
