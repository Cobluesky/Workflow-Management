# DOCS

이 폴더는 현재 프로젝트의 아키텍처, API, 배포, 운영 검증, 리뷰 규칙 문서를 모아둔 기준 문서 디렉터리다.

## 핵심 문서
- `ARCHITECTURE.md`
- `HANDOUT.md`
- `FILE_SPEC.md`
- `MODULE_DB_REFACTOR.md`
- `SPLIT_SCOPE.md`
- `API_SPEC.md`
- `DEPLOYMENT.md`
- `Requirements.md`
- `TODO.md`

## auth-server 문서
- `auth-server/README.md`
- `auth-server/VERIFICATION.md`

## 코드 리뷰 규칙
- `code-review-rules/base.md`
- `code-review-rules/forbidden.md`
- `code-review-rules/examples.md`

## 배포 예시 파일
- `../deploy/env/timetable-web.env.example`
- `../deploy/env/workspace-auth-server.env.example`
- `../deploy/nginx/workspace.p-e.kr.conf.example`

## 현재 운영 기준 요약
- 앱 도메인: `https://app.workspace.p-e.kr`
- 인증 도메인: `https://auth.workspace.p-e.kr`
- 앱 컨테이너: `timetable-web`
- 인증 컨테이너: `workspace-auth-server`
- 앱 DB: `timetable_db`
- 인증 DB: `workspace_auth`
- 인증 서버 CORS 및 HTTPS 적용 완료
- 일반 로그인, 회원가입, Refresh, OAuth 브라우저 검증 완료
- 메인 페이지 파일: `app/page.tsx`
- 실제 모듈: `timetable`, `mypage`, `calendar`, `tasks`
- DB 분리 리팩토링은 `MODULE_DB_REFACTOR.md`를 기준으로 진행
- 멀티 스키마 전환 중이며 runtime Prisma client는 `prisma/schemas/*.prisma` 기반 generated client를 사용하기 시작함
