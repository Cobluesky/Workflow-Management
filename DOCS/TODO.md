# 작업 TODO

## 1. 완료된 기반 작업
- [x] `DOCS/ARCHITECTURE.md` 기준 아키텍처 정의
- [x] `auth-server` 프로젝트 생성
- [x] 로컬 인증 API 구현
- [x] `POST /api/v1/auth/register`
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/refresh`
- [x] `GET /api/v1/auth/verify`
- [x] `POST /api/v1/auth/logout`
- [x] OAuth 서버 코드 구현
- [x] `GET /api/v1/auth/provider/:provider`
- [x] `GET /api/v1/auth/callback/:provider`
- [x] 루트 앱 `next-auth` 제거 1차 완료
- [x] 루트 앱 로그인/회원가입/로그아웃을 Auth Server 기반으로 전환
- [x] 루트 앱 보호 API 일부를 Bearer Token 기반으로 전환
- [x] 루트 앱과 `auth-server` 테스트 작성 및 통과
- [x] 앱/인증 서버 Docker 이미지 분리
- [x] 앱/인증 서버 GitHub Actions 배포 구조 분리
- [x] `auth.workspace.p-e.kr` 인증서 발급 및 HTTPS 적용

## 2. 현재 최우선 작업
- [ ] `workspace_auth` 데이터베이스 생성
- [ ] `workspace_auth` 전용 DB 사용자 생성 및 권한 부여
- [ ] 운영 `workspace-auth-server.env`의 `DATABASE_URL`을 실제 Auth DB 기준으로 확정
- [ ] 운영 `workspace-auth-server` 기동 확인
- [ ] `http://127.0.0.1:4000/health` 응답 확인
- [ ] `https://auth.workspace.p-e.kr/health` 응답 확인
- [ ] 운영 `timetable-web`과 `workspace-auth-server`의 DB 연결 방식을 표준화
- [ ] 호스트 DB 사용 시 `host.docker.internal` 규칙 확정
- [ ] `docker run`에 `--add-host=host.docker.internal:host-gateway` 반영

## 3. Auth DB 준비
- [ ] `workspace_auth`에 Auth Server Prisma 마이그레이션 적용
- [ ] 운영 Auth DB 스키마 검증
- [ ] `User`
- [ ] `OAuthAccount`
- [ ] `RefreshToken`
- [ ] Auth DB 접속 계정의 최소 권한 범위 결정
- [ ] 개발/운영 Auth DB 접속 규칙 문서화

## 4. 기존 계정 이관
- [ ] `timetable_db.User` 구조 점검
- [ ] `email`
- [ ] `password`
- [ ] `alias`
- [ ] 기존 `password` 해시 포맷 확인
- [ ] `timetable_db.User -> workspace_auth.User` 이관 스크립트 작성
- [ ] 중복 이메일 처리 정책 확정
- [ ] `name` 초기값 채우는 정책 확정
- [ ] 이관 후 샘플 계정 로그인 검증

## 5. 사용자 식별자 전환
- [ ] `timetable_db.User`에 `authUserId` 필드 추가 설계
- [ ] `authUserId` 마이그레이션 방식 확정
- [ ] [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 를 `authUserId` 중심 구조로 전환
- [ ] 이메일 기반 `upsert`를 임시 fallback으로 축소
- [ ] 장기적으로 `timetable_db.User.password` 제거 계획 확정

## 6. 루트 앱 정합성 정리
- [ ] 루트 앱 API와 인증 연결을 `authUserId` 기준으로 재정리
- [ ] 보호 API 공통 인증 유틸 또는 미들웨어 정리
- [ ] 시간표 API에서 로컬 사용자 결정 흐름 재검토
- [ ] 별명/프로필 API의 사용자 연결 규칙 재정리
- [ ] OAuth callback 이후 클라이언트 세션 반영 흐름 재검토

## 7. OAuth 운영 전환
- [ ] 운영 `AUTH_ENV_FILE`에 실제 OAuth 키 반영
- [ ] Google 콘솔 설정 검증
- [ ] Callback URL
- [ ] 허용 도메인
- [ ] GitHub 콘솔 설정 검증
- [ ] Callback URL
- [ ] Homepage URL
- [ ] Kakao 콘솔 설정 검증
- [ ] Redirect URI
- [ ] 사이트 도메인
- [ ] 브라우저 기준 Google 로그인 검증
- [ ] 브라우저 기준 GitHub 로그인 검증
- [ ] 브라우저 기준 Kakao 로그인 검증
- [ ] 장기적으로 OAuth callback의 `accessToken` query 전달 방식을 one-time code 방식으로 개선

## 8. 배포 및 운영 안정화
- [ ] GitHub Actions 배포가 auth/app 모두에서 동일한 env 규칙을 따르도록 정리
- [ ] 운영 `APP_ENV_FILE`과 `AUTH_ENV_FILE` 최종 템플릿 확정
- [ ] OCI 서버 env 파일 생성/갱신 절차 문서화
- [ ] Nginx 중복 `server_name` 경고 정리
- [ ] `auth.workspace.p-e.kr` 프록시 설정 최종 검증
- [ ] `app.workspace.p-e.kr` 프록시 설정 최종 검증
- [ ] 운영 Docker 이미지 크기와 빌드 시간 추가 최적화 검토

## 9. 보안 강화
- [ ] 운영용 JWT 시크릿 재발급 및 회전
- [ ] 운영용 OAuth client secret 재발급 및 회전
- [ ] 로그인/회원가입/refresh Rate Limit 추가
- [ ] Refresh Token 폐기 전략 보강
- [ ] 인증 이벤트 로그 또는 감사 로그 추가
- [ ] 운영 쿠키 정책 최종 검증
- [ ] `JWT_ISSUER`, `JWT_AUDIENCE`, `COOKIE_DOMAIN`, `CLIENT_ORIGINS` 최종 잠금

## 10. 테스트 및 검증
- [ ] 운영 Auth Server 수동 검증
- [ ] `register`
- [ ] `login`
- [ ] `verify`
- [ ] `refresh`
- [ ] `logout`
- [ ] 운영 루트 앱 수동 검증
- [ ] `signup -> login -> mypage -> timetable save/load`
- [ ] 서브도메인 쿠키 동작 검증
- [ ] 로그아웃 후 refresh 차단 검증
- [ ] OAuth 공급자별 end-to-end 검증
- [ ] `authUserId` 전환 이후 회귀 테스트 추가

## 11. 문서 정리
- [x] `DOCS/ARCHITECTURE.md` 작성
- [ ] `DOCS/API_SPEC.md`를 현재 구현과 목표 구조 기준으로 재작성
- [ ] `DOCS/Requirements.md`를 아키텍처 기준으로 재정렬
- [ ] `DOCS/DEPLOYMENT.md`에 운영 env/DB 연결 규칙 반영
- [ ] `DOCS/auth-server/README.md`를 현재 구현 기준으로 재작성
- [ ] `DOCS/auth-server/VERIFICATION.md`를 운영 검증 절차 기준으로 보강

## 12. 장기 과제
- [ ] 추가 서비스(`project1` 등)도 `authUserId` 기반으로 설계
- [ ] 공통 사용자 프로필 속성의 소유 위치 결정
- [ ] 필요 시 User Profile 전용 서비스 분리 검토
- [ ] 다중 서비스 간 권한/역할 모델 확장 검토
