#!/bin/bash

# Docker Health Check Script for Distributed Parcel Delivery System
# This script validates all containers are running and healthy

set -e

echo "======================================"
echo " Docker Health Check & Validation"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for checks
PASS=0
FAIL=0

check_service() {
    local service_name=$1
    local container_name=$2
    
    echo -n "Checking $service_name... "
    
    # Check if container exists and is running
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        # Check health status
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
        
        if [ "$health_status" = "healthy" ]; then
            echo -e "${GREEN}✓ HEALTHY${NC}"
            ((PASS++))
        elif [ "$health_status" = "no-healthcheck" ]; then
            # For services without healthcheck, check if running
            if docker ps --format '{{.Names}}' --filter "status=running" | grep -q "^${container_name}$"; then
                echo -e "${GREEN}✓ RUNNING${NC}"
                ((PASS++))
            else
                echo -e "${RED}✗ NOT RUNNING${NC}"
                ((FAIL++))
            fi
        else
            echo -e "${YELLOW}⚠ $health_status${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        ((FAIL++))
    fi
}

echo "1. Container Status Check"
echo "-------------------------"
check_service "PostgreSQL (User DB)" "db-user"
check_service "PostgreSQL (Order DB)" "db-order"
check_service "PostgreSQL (Payment DB)" "db-payment"
check_service "RabbitMQ" "rabbitmq"
check_service "User Service" "user-app"
check_service "Order Service" "order-app"
check_service "Payment Service" "payment-app"
check_service "Notification Service" "notification-app"
check_service "Frontend" "frontend-app"
check_service "Nginx Load Balancer" "nginx-lb"
echo ""

echo "2. Network Connectivity Check"
echo "------------------------------"

# Check if delivery_network exists
if docker network ls | grep -q "delivery_network"; then
    echo -e "${GREEN}✓ delivery_network exists${NC}"
    ((PASS++))
    
    # Count connected containers
    connected=$(docker network inspect delivery_network -f '{{range .Containers}}{{.Name}} {{end}}' | wc -w)
    echo "  Connected containers: $connected"
else
    echo -e "${RED}✗ delivery_network not found${NC}"
    ((FAIL++))
fi
echo ""

echo "3. Port Exposure Check"
echo "----------------------"
ports=("80:nginx-lb" "5173:frontend-app" "5672:rabbitmq" "15672:rabbitmq" "5433:db-order" "5434:db-payment" "5435:db-user")

for port_mapping in "${ports[@]}"; do
    IFS=':' read -r port container <<< "$port_mapping"
    echo -n "Port $port ($container)... "
    
    if docker ps --format '{{.Names}} {{.Ports}}' | grep "$container" | grep -q "$port"; then
        echo -e "${GREEN}✓ EXPOSED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ NOT EXPOSED${NC}"
        ((FAIL++))
    fi
done
echo ""

echo "4. Service DNS Resolution Check"
echo "--------------------------------"
# Test DNS resolution from api-gateway container
if docker ps -q -f name=user-app >/dev/null 2>&1; then
    echo -n "Testing user-service DNS... "
    if docker exec user-app getent hosts db-user >/dev/null 2>&1; then
        echo -e "${GREEN}✓ RESOLVED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAIL++))
    fi
    
    echo -n "Testing rabbitmq DNS... "
    if docker exec user-app getent hosts rabbitmq >/dev/null 2>&1; then
        echo -e "${GREEN}✓ RESOLVED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠ Skipping DNS tests (user-app not running)${NC}"
fi
echo ""

echo "5. Health Endpoint Check"
echo "-------------------------"
# Wait a bit for services to fully start
sleep 2

endpoints=("http://localhost/api/health:API Gateway" "http://localhost/health:Nginx" "http://localhost:5173:Frontend")

for endpoint_mapping in "${endpoints[@]}"; do
    IFS=':' read -r url service <<< "$endpoint_mapping"
    echo -n "$service ($url)... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✓ OK${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAIL++))
    fi
done
echo ""

echo "======================================"
echo " Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All checks passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Please review the output above.${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Check logs: docker-compose logs --tail=50"
    echo "2. Restart services: docker-compose restart"
    echo "3. Rebuild if needed: docker-compose up -d --build"
    exit 1
fi
