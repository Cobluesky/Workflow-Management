# 배포 가이드

## 현재 운영 구성
- `app.workspace.p-e.kr` -> `timetable-web` -> `127.0.0.1:3000`
- `auth.workspace.p-e.kr` -> `workspace-auth-server` -> `127.0.0.1:4000`
- MariaDB는 OCI 호스트 OS에서 직접 실행
- 앱/인증 컨테이너는 `host.docker.internal`로 호스트 DB에 연결

## GitHub Actions 배포
- auth 이미지 빌드/푸시
- app runtime 이미지 빌드/푸시
- app migrator 이미지 빌드/푸시
- 서버에서 env 파일 생성
- auth: `prisma migrate deploy`
- app: `db-push timetable -> core -> calendar -> tasks`
- 이후 runtime 컨테이너 교체

## 주요 Secrets
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
- `APP_ENV_FILE`
- `AUTH_ENV_FILE`

## APP_ENV_FILE 예시
```env
DATABASE_URL=mysql://timetable_user:app_password@host.docker.internal:3306/timetable_db
WORKSPACE_CORE_DATABASE_URL=mysql://workspace_core_user:workspace_core_password@host.docker.internal:3306/workspace_core
CALENDAR_DATABASE_URL=mysql://calendar_user:calendar_password@host.docker.internal:3306/calendar_db
TASKS_DATABASE_URL=mysql://tasks_user:tasks_password@host.docker.internal:3306/tasks_db
AUTH_SERVER_URL=https://auth.workspace.p-e.kr
NEXT_PUBLIC_AUTH_SERVER_URL=https://auth.workspace.p-e.kr
```

## AUTH_ENV_FILE 예시
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
```

## Nginx
- 예시 파일: [deploy/nginx/workspace.p-e.kr.conf.example](/C:/workflow-management/deploy/nginx/workspace.p-e.kr.conf.example)
- 외부에 metrics 엔드포인트를 노출하지 않도록 `/api/metrics`, `/metrics` 차단 규칙 포함
- monitoring stack은 host network를 쓰되 모든 서비스가 `127.0.0.1`에만 bind한다
- nginx 차단 규칙은 추가 방어선으로 둔다

## 운영 점검 명령
```bash
docker ps
docker logs workspace-auth-server --tail 100
docker logs timetable-web --tail 100
curl -i http://127.0.0.1:4000/health
curl -i https://auth.workspace.p-e.kr/health
curl -I https://app.workspace.p-e.kr
```

## Monitoring Stack
### 구성
- Prometheus
- Grafana
- node-exporter
- mysqld-exporter

### 파일
- [deploy/monitoring/docker-compose.monitoring.yml](/C:/workflow-management/deploy/monitoring/docker-compose.monitoring.yml)
- [deploy/monitoring/prometheus/prometheus.yml](/C:/workflow-management/deploy/monitoring/prometheus/prometheus.yml)
- [deploy/monitoring/grafana/provisioning/datasources/prometheus.yml](/C:/workflow-management/deploy/monitoring/grafana/provisioning/datasources/prometheus.yml)
- [deploy/monitoring/grafana/provisioning/dashboards/workspace-overview.yml](/C:/workflow-management/deploy/monitoring/grafana/provisioning/dashboards/workspace-overview.yml)
- [deploy/monitoring/grafana/dashboards/workspace/workspace-overview.json](/C:/workflow-management/deploy/monitoring/grafana/dashboards/workspace/workspace-overview.json)
- [deploy/env/monitoring.env.example](/C:/workflow-management/deploy/env/monitoring.env.example)

### 모니터링 실행
- 아래 명령은 배포된 repository checkout root에서 실행한다고 가정한다
```bash
sudo mkdir -p /opt/workspace/monitoring
sudo cp -R deploy/monitoring/* /opt/workspace/monitoring/
sudo cp deploy/env/monitoring.env.example /opt/workspace/monitoring/monitoring.env
cd /opt/workspace/monitoring
docker compose --env-file monitoring.env -f docker-compose.monitoring.yml up -d
```

### 접근 정책
- Prometheus, Grafana, node-exporter, mysqld-exporter 모두 `127.0.0.1`에만 bind한다
- Grafana 외부 접속이 필요하면 SSH tunnel 또는 별도 내부용 reverse proxy를 둔다
- Grafana는 provisioning으로 `Workspace Overview` 대시보드를 자동 로드한다

### Prometheus scrape 대상
- `127.0.0.1:3000/api/metrics` (`timetable-web`)
- `127.0.0.1:4000/metrics` (`workspace-auth-server`)
- `127.0.0.1:9100` (`node-exporter`)
- `127.0.0.1:9104` (`mysqld-exporter`)

### MySQL exporter 계정 예시
```sql
CREATE USER IF NOT EXISTS 'prometheus_exporter'@'localhost' IDENTIFIED BY 'change-this-password';
CREATE USER IF NOT EXISTS 'prometheus_exporter'@'%' IDENTIFIED BY 'change-this-password';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'prometheus_exporter'@'localhost';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'prometheus_exporter'@'%';
FLUSH PRIVILEGES;
```

### mysqld-exporter 자격 증명 전달 방식
- 현재 compose는 `--mysqld.username=${MYSQLD_EXPORTER_USER}`와 `MYSQLD_EXPORTER_PASSWORD` 조합으로 자격 증명을 넘긴다
- `prom/mysqld-exporter` 최신 버전에서 예전 `DATA_SOURCE_NAME` 방식이 남아 있으면 `no user specified in section or parent` 로그와 함께 기동에 실패할 수 있다
- `MYSQLD_EXPORTER_USER` 또는 `MYSQLD_EXPORTER_PASSWORD` 값이 비어 있어도 같은 증상이 난다

### 모니터링 확인
```bash
curl -i http://127.0.0.1:3000/api/metrics
curl -i http://127.0.0.1:4000/metrics
curl -i http://127.0.0.1:9090/-/ready
curl -I http://127.0.0.1:3100/login
```

### monitoring compose 변경 적용
- `network_mode` 변경은 `restart`만으로 반영되지 않는다
- 구조를 바꿨다면 `down` 후 다시 `up -d`로 재생성해야 한다
```bash
cd ~/monitoring
docker compose --env-file monitoring.env -f docker-compose.monitoring.yml down
docker compose --env-file monitoring.env -f docker-compose.monitoring.yml up -d
```

### Grafana provisioning 복구 팁
- dashboard provider YAML과 dashboard JSON은 같은 폴더에 두지 않는다
- 현재 기준 경로:
  - provider: `grafana/provisioning/dashboards/workspace-overview.yml`
  - dashboard JSON: `grafana/dashboards/workspace/workspace-overview.json`
- 예전 `grafana/provisioning/dashboards/workspace-overview.json` 파일이 서버에 남아 있으면 삭제 후 재기동한다
