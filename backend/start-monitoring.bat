@echo off
REM Quick start script for monitoring stack (Windows)

echo Starting Monitoring Stack...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Please start Docker first.
    exit /b 1
)

REM Start monitoring services
echo Starting Prometheus...
docker-compose up -d prometheus

echo Starting Grafana...
docker-compose up -d grafana

echo Starting Alertmanager...
docker-compose up -d alertmanager

echo Starting Exporters...
docker-compose up -d node-exporter redis-exporter postgres-exporter

REM Wait for services to be healthy
echo Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

REM Check service status
echo.
echo Service Status:
docker-compose ps prometheus grafana alertmanager node-exporter

echo.
echo Monitoring stack is ready!
echo.
echo Access dashboards:
echo    Grafana:       http://localhost:3001 (admin/admin)
echo    Prometheus:    http://localhost:9090
echo    Alertmanager:  http://localhost:9093
echo.
echo Logs:
echo    docker-compose logs -f prometheus
echo    docker-compose logs -f grafana
echo.
