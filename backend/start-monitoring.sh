#!/bin/bash

# Quick start script for monitoring stack

echo "🚀 Starting Monitoring Stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start monitoring services
echo "📊 Starting Prometheus..."
docker-compose up -d prometheus

echo "📈 Starting Grafana..."
docker-compose up -d grafana

echo "🔔 Starting Alertmanager..."
docker-compose up -d alertmanager

echo "📡 Starting Exporters..."
docker-compose up -d node-exporter redis-exporter postgres-exporter

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "✅ Service Status:"
docker-compose ps prometheus grafana alertmanager node-exporter

echo ""
echo "🎉 Monitoring stack is ready!"
echo ""
echo "📊 Access dashboards:"
echo "   Grafana:       http://localhost:3001 (admin/admin)"
echo "   Prometheus:    http://localhost:9090"
echo "   Alertmanager:  http://localhost:9093"
echo ""
echo "📝 Logs:"
echo "   docker-compose logs -f prometheus"
echo "   docker-compose logs -f grafana"
echo ""
