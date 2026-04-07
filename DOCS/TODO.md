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
- [x] 루트 앱 `next-auth` 제거
- [x] 루트 앱 로그인/회원가입/로그아웃을 Auth Server 기반으로 전환
- [x] 루트 앱 보호 API 일부를 Bearer Token 기반으로 전환
- [x] 앱/인증 서버 테스트 작성 및 통과
- [x] 앱/인증 서버 Docker 이미지 분리
- [x] 앱/인증 서버 GitHub Actions 배포 구조 분리
- [x] `auth.workspace.p-e.kr` 인증서 발급 및 HTTPS 적용
- [x] 운영 `workspace_auth` 데이터베이스 준비
- [x] 운영 `workspace-auth-server` 기동 확인
- [x] 운영 `https://auth.workspace.p-e.kr/health` 응답 확인
- [x] 호스트 DB 사용 시 `host.docker.internal` 규칙 적용
- [x] `docker run`에 `--add-host=host.docker.internal:host-gateway` 반영
- [x] Auth Server CORS 운영 이슈 해결
- [x] 일반 로그인/회원가입 브라우저 검증 완료
- [x] OAuth SNS 로그인 브라우저 검증 완료
- [x] 회원가입 프론트 validation 보강

## 2. 현재 최우선 작업
- [ ] 모듈 DB 분리 리팩토링 기준 확정
- [ ] `workspace_core` / `profile_db` 책임 범위 결정
- [ ] `tasks_db`를 첫 분리 대상으로 확정
- [x] Prisma multi-schema 구조 초안 작성
- [x] `tasks` runtime Prisma client를 `authUserId` 기준 모듈 저장소 구조에 맞게 정리
- [ ] `workspace_auth` DB 스키마를 기준 문서와 일치하는지 최종 점검
- [x] 운영 `APP_ENV_FILE`과 `AUTH_ENV_FILE` 템플릿을 실제 운영값 기준으로 다시 검토
- [ ] `DOCS/Requirements.md`를 최신 운영 상태 기준으로 보강
- [ ] `DOCS/auth-server/VERIFICATION.md`에 운영 검증 절차 반영

## 3. Auth DB 준비
- [x] `workspace_auth`에 Auth Server Prisma 마이그레이션 적용
- [ ] 운영 Auth DB 스키마 검증
- [ ] `User`
- [ ] `OAuthAccount`
- [ ] `RefreshToken`
- [ ] Auth DB 접속 계정의 최소 권한 범위 결정
- [x] 개발/운영 Auth DB 접속 규칙 문서화

## 4. 기존 계정 이관
- [ ] 테스트용 기존 `timetable_db` 데이터 정리 여부 확정
- [ ] mock 데이터 초기화 절차 문서화
- [ ] 운영 데이터가 필요한 시점의 이관 전략 재정의
- [ ] `timetable_db.User.password` 제거 타이밍 확정

## 5. 사용자 식별자 전환
- [x] `timetable_db.User`에 `authUserId` 필드 추가 설계
- [x] `authUserId` 마이그레이션 방식 확정
- [x] [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 를 `authUserId` 중심 구조로 전환
- [x] 이메일 기반 `upsert`를 임시 fallback으로 축소
- [ ] 장기적으로 `timetable_db.User.password` 제거 계획 확정

## 6. 루트 앱 정합성 정리
- [x] 루트 앱 API와 인증 연결을 `authUserId` 기준으로 재정리
- [ ] 보호 API 공통 인증 유틸 또는 미들웨어 정리
- [x] 시간표 API에서 로컬 사용자 결정 흐름 재정리
- [ ] 별명/프로필 API의 사용자 연결 규칙 재정리
- [x] OAuth callback 이후 클라이언트 세션 반영 흐름 재검토

## 6.5 모듈 워크스페이스
- [x] 사이드바 기반 모듈 워크스페이스 셸 추가
- [x] 기본 활성 모듈(`timetable`, `mypage`)만 초기 노출
- [x] 사이드바 항목별 제거(`X`) 동작 추가
- [x] 사이드바 하단 `+` 버튼과 모듈 추가 모달 추가
- [x] 사용자별 활성 모듈 목록을 서버(`WorkspaceModulePreference`)에 저장
- [x] 모듈별 현재 저장소와 계획 저장소를 구분해서 노출
- [ ] 모듈 순서 변경 UX 설계
- [x] `calendar` 모듈 1차 구현
- [x] `tasks` 모듈 1차 구현
- [ ] `projects` 모듈 1차 구현
- [x] 모듈별 전용 DB와 Prisma 클라이언트 분리 전략 문서화
- [ ] `WorkspaceModulePreference`를 `workspace_core`로 이동
- [ ] 별명/프로필 데이터를 `workspace_core` 또는 `profile_db`로 이동
- [ ] `TaskItem`을 `tasks_db`로 이동
- [x] `/api/tasks`를 tasks 전용 Prisma client로 전환
- [ ] `CalendarEvent`를 `calendar_db`로 이동
- [x] `/api/calendar`를 calendar 전용 Prisma client로 전환
- [ ] `timetable_db`를 시간표 전용 스키마로 축소

## 7. OAuth 운영 전환
- [x] 운영 `AUTH_ENV_FILE`에 실제 OAuth 키 반영
- [x] Google 콘솔 설정 검증
- [x] Google 브라우저 로그인 검증
- [x] GitHub 콘솔 설정 검증
- [x] GitHub 브라우저 로그인 검증
- [x] Kakao 콘솔 설정 검증
- [x] Kakao 브라우저 로그인 검증
- [ ] 장기적으로 OAuth callback의 `accessToken` query 전달 방식을 one-time code 방식으로 개선

## 8. 배포 및 운영 안정화
- [x] GitHub Actions 배포가 auth/app 모두에서 동일한 env 규칙을 따르도록 정리
- [x] 운영 `APP_ENV_FILE`과 `AUTH_ENV_FILE` 템플릿 확정
- [x] OCI 서버 env 파일 생성/갱신 절차 문서화
- [x] `auth.workspace.p-e.kr` 프록시 설정 최종 검증
- [x] `app.workspace.p-e.kr` 프록시 설정 최종 검증
- [x] Auth Server CORS preflight 운영 검증
- [ ] Nginx 중복 `server_name` 경고 정리
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
- [x] 운영 Auth Server 수동 검증
- [x] `register`
- [x] `login`
- [x] `verify`
- [x] `refresh`
- [x] `logout`
- [x] 운영 루트 앱 수동 검증
- [x] `signup -> login -> mypage -> timetable save/load`
- [x] OAuth 공급자별 end-to-end 검증
- [x] 회원가입 프론트 validation 검증
- [ ] 서브도메인 쿠키 동작 장기 검증
- [ ] 로그아웃 후 refresh 차단 장기 검증
- [ ] `authUserId` 전환 이후 회귀 테스트 추가
- [x] `calendar` API 테스트 추가
- [x] `tasks` API 테스트 추가

## 11. 문서 정리
- [x] `DOCS/ARCHITECTURE.md` 작성
- [x] `DOCS/API_SPEC.md`를 현재 구현과 목표 구조 기준으로 재작성
- [x] `DOCS/TODO.md`를 현재 운영 상태 기준으로 갱신
- [x] `DOCS/DEPLOYMENT.md`에 운영 env/DB 연결 규칙 반영
- [x] `DOCS/auth-server/README.md`를 현재 구현 기준으로 재작성
- [x] 모듈 워크스페이스 구조와 저장 방식 반영
- [x] `DOCS/MODULE_DB_REFACTOR.md`에 모듈 DB 분리 전략 정리
- [ ] `DOCS/Requirements.md`를 최신 운영 상태 기준으로 보강
- [ ] `DOCS/auth-server/VERIFICATION.md`를 운영 검증 절차 기준으로 보강

## 12. 장기 과제
- [ ] 추가 서비스(`project1` 등)도 `authUserId` 기반으로 설계
- [ ] 공통 사용자 프로필 속성의 소유 위치 결정
- [ ] 필요 시 User Profile 전용 서비스 분리 검토
- [ ] 다중 서비스 간 권한/역할 모델 확장 검토
