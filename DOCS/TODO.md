# TODO

## 1. 현재 최우선 작업
- [x] `workspace_core` 책임 범위 확정
- [x] `tasks_db`를 첫 분리 대상으로 확정
- [x] `calendar_db` 런타임 분리 반영
- [x] `tasks_db` 런타임 분리 반영
- [x] `workspace_core` 런타임 분리 반영
- [ ] `projects_db` 런타임 분리 설계 시작

## 2. 워크스페이스 셸
- [x] 사이드바 모듈 추가/제거
- [x] 사용자별 활성 모듈 목록 서버 저장
- [x] core 장애 시 로컬 캐시 fallback
- [x] core 복구 후 미반영 모듈 변경 replay
- [ ] 모듈 순서 변경 UX

## 3. 프로필 / core
- [x] `WorkspaceModulePreference`를 `workspace_core`로 이동
- [x] 별명/프로필 데이터를 `workspace_core` 주 저장소로 전환
- [x] core 복구 시 alias mismatch 재조정
- [ ] legacy alias 동기화 제거 시점 결정

## 4. 모듈 DB 분리
- [x] `/api/tasks`를 tasks 전용 Prisma client로 전환
- [x] `TaskItem`을 `tasks_db` 런타임 경로로 전환
- [x] `/api/calendar`를 calendar 전용 Prisma client로 전환
- [x] `CalendarEvent`를 `calendar_db` 런타임 경로로 전환
- [ ] `projects_db` schema/client 추가
- [ ] `projects` 모듈 1차 구현

## 5. timetable legacy 축소
- [ ] `timetable_db`를 시간표 전용 스키마로 더 축소
- [ ] legacy `User.password` 제거 타이밍 확정
- [ ] 필요 없는 legacy 테이블/컬럼 정리

## 6. 배포 / 검증
- [x] split DB URL fail-fast 적용
- [x] `db-push timetable -> core -> calendar -> tasks` 순서 정리
- [ ] split DB smoke check 자동화
- [ ] core/calendar/tasks 회귀 테스트 보강
