# 작업 TODO

## 1. 현재 상태 요약
- [x] `auth-server` 프로젝트 생성
- [x] 회원가입 API 구현
- [x] 로그인 API 구현
- [x] Refresh API 구현
- [x] Verify API 구현
- [x] Logout API 구현
- [x] Prisma 스키마 및 기본 마이그레이션 구조 구성
- [x] `auth-server` 테스트 작성
- [x] `auth-server` 테스트 통과
- [x] 루트 앱 `next-auth` 제거 1차 완료
- [x] 루트 앱 로그인/회원가입/로그아웃 화면 전환
- [x] 루트 앱 보호 API 일부를 Bearer Token 기반으로 전환
- [x] 루트 앱 배포 설정을 `AUTH_SERVER_URL` 기준으로 변경

## 2. 우선순위 높음
- [ ] 루트 앱 [app/api/timetable/route.ts](/C:/workflow-management/app/api/timetable/route.ts) 응답 형식과 에러 메시지 정리
- [ ] 루트 앱 [lib/server-auth.ts](/C:/workflow-management/lib/server-auth.ts) 에러 메시지 정리
- [ ] 루트 앱 [app/Providers.tsx](/C:/workflow-management/app/Providers.tsx) 남아 있는 깨진 문자열 정리
- [ ] 루트 앱 실제 브라우저 시나리오 검증
- [ ] `signup -> login -> mypage -> timetable save/load` 전체 흐름 수동 검증

## 3. 인증 구조 보강
- [ ] Auth Server 사용자 ID와 루트 앱 로컬 사용자 ID 연결 전략 확정
- [ ] 이메일 기준 `upsert` 방식의 장기 유지 여부 결정
- [ ] 필요 시 루트 앱 도메인 DB에 `authUserId` 연결 필드 추가
- [ ] 보호 API 공통 인증 유틸 또는 미들웨어 정리

## 4. OAuth 구현
- [ ] `GET /api/v1/auth/provider/:provider` 구현
- [ ] `GET /api/v1/auth/callback/:provider` 구현
- [ ] Google OAuth 연동
- [ ] Kakao OAuth 연동
- [ ] GitHub OAuth 연동
- [ ] OAuth `state` 검증 및 복귀 URL 처리

## 5. 보안 강화
- [ ] 로그인/회원가입/refresh Rate Limit 추가
- [ ] Refresh Token 폐기 전략 보강
- [ ] 감사 로그 또는 인증 이벤트 로그 추가
- [ ] 운영 쿠키 정책 최종 검증
- [ ] 운영용 `JWT_ISSUER`, `JWT_AUDIENCE`, `COOKIE_DOMAIN` 값 확정

## 6. 배포 및 운영
- [ ] `auth-server` 전용 GitHub Actions 배포 워크플로 작성
- [ ] `auth-server` OCI 배포 스크립트 정리
- [ ] Reverse Proxy에 `auth.workspace.p-e.kr` 라우팅 적용
- [ ] 운영 Docker 환경에서 `AUTH_SERVER_URL` 및 `NEXT_PUBLIC_AUTH_SERVER_URL` 검증
- [ ] ARM64 운영 서버에서 Auth Server 실기동 확인

## 7. 테스트
- [ ] Auth Server OAuth 테스트 추가
- [ ] 루트 앱 인증 연동 테스트 추가
- [ ] 루트 앱 보호 API 테스트 추가
- [ ] 서브도메인 쿠키 동작 스테이징 검증
- [ ] 로그아웃 후 Refresh 차단 검증

## 8. 문서
- [x] `Requirements.md` 갱신
- [x] `TODO.md` 갱신
- [ ] `API_SPEC.md`를 실제 구현 기준으로 한 번 더 동기화
- [ ] `auth-server/README.md`를 현재 구현 기준으로 재작성
- [ ] 운영 환경 변수 표 정리
