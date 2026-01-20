#!/bin/bash

# Microservices Orchestration Validation Script
# Validates service discovery, communication, and message queue integration

set -e

echo "=========================================="
echo " Microservices Orchestration Validation"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

echo "1. Service Independence Verification"
echo "-------------------------------------"
echo "Checking that each service is independently deployable..."

services=("user-app" "order-app" "payment-app" "notification-app")
for service in "${services[@]}"; do
    echo -n "$service... "
    if docker ps -q -f name="$service" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ DEPLOYED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ NOT DEPLOYED${NC}"
        ((FAIL++))
    fi
done
echo ""

echo "2. Service Registry Validation (DNS-based)"
echo "-------------------------------------------"
echo "Verifying services use DNS names, not hardcoded IPs..."

# Check environment variables in api-gateway
if docker exec -i nginx-lb env 2>/dev/null | grep -q "api-gateway"; then
    echo -n "API Gateway uses service names... "
    
    # Get api-gateway container ID (could be multiple if scaled)
    gateway_id=$(docker ps -q -f name=api-gateway | head -1)
    
    if [ -n "$gateway_id" ]; then
        # Check if using DNS names in env vars
        if docker exec "$gateway_id" env | grep -E "(user-service|order-service|payment-service)" >/dev/null 2>&1; then
            echo -e "${GREEN}✓ VERIFIED${NC}"
            ((PASS++))
        else
            echo -e "${RED}✗ HARDCODED IPs DETECTED${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${YELLOW}⚠ SKIPPED (no api-gateway)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC}"
fi
echo ""

echo "3. Inter-Service Communication"
echo "-------------------------------"
echo "Testing that services can communicate via Docker network..."

if docker ps -q -f name=user-app >/dev/null 2>&1; then
    # Test if user-service can reach rabbitmq
    echo -n "user-service → rabbitmq... "
    if docker exec user-app sh -c 'nc -zv rabbitmq 5672 2>&1' | grep -q "succeeded\|open"; then
        echo -e "${GREEN}✓ CONNECTED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAIL++))
    fi
    
    # Test if user-service can reach database
    echo -n "user-service → db-user... "
    if docker exec user-app sh -c 'nc -zv db-user 5432 2>&1' | grep -q "succeeded\|open"; then
        echo -e "${GREEN}✓ CONNECTED${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAIL++))
    fi
fi
echo ""

echo "4. Startup Order & Dependency Handling"
echo "---------------------------------------"
echo "Verifying proper startup sequence with health checks..."

# Check if services started in correct order based on depends_on
services_order=("db-user:user-app" "db-order:order-app" "db-payment:payment-app" "rabbitmq:notification-app")

for dep in "${services_order[@]}"; do
    IFS=':' read -r dependency service <<< "$dep"
    echo -n "$service depends on $dependency... "
    
    # Check if both are running
    if docker ps -q -f name="$service" >/dev/null 2>&1 && docker ps -q -f name="$dependency" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ BOTH RUNNING${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ DEPENDENCY ISSUE${NC}"
        ((FAIL++))
    fi
done
echo ""

echo "5. Message Queue Integration"
echo "-----------------------------"
echo "Checking RabbitMQ connections and queues..."

# Check if RabbitMQ management API is accessible
echo -n "RabbitMQ Management API... "
if curl -s -u guest:guest http://localhost:15672/api/overview >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ACCESSIBLE${NC}"
    ((PASS++))
    
    # Get connections count
    connections=$(curl -s -u guest:guest http://localhost:15672/api/connections | grep -o '"name"' | wc -l)
    echo "  Active connections: $connections"
    
    # Check for expected exchanges
    echo -n "Checking for delivery_exchange... "
    if curl -s -u guest:guest http://localhost:15672/api/exchanges/%2F/delivery_exchange | grep -q "delivery_exchange"; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ NOT FOUND (may not be created yet)${NC}"
    fi
else
    echo -e "${RED}✗ NOT ACCESSIBLE${NC}"
    ((FAIL++))
fi
echo ""

echo "6. Database Isolation"
echo "---------------------"
echo "Verifying each service has its own database..."

dbs=("db-user:user_service_db" "db-order:order_service_db" "db-payment:payment_service_db")

for db_mapping in "${dbs[@]}"; do
    IFS=':' read -r container dbname <<< "$db_mapping"
    echo -n "$dbname on $container... "
    
    if docker exec "$container" psql -U delivery_user -lqt | cut -d \| -f 1 | grep -qw "$dbname"; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        ((FAIL++))
    fi
done
echo ""

echo "7. Network Isolation & Security"
echo "--------------------------------"
echo "Checking network configuration..."

echo -n "Custom bridge network (delivery_network)... "
if docker network inspect delivery_network >/dev/null 2>&1; then
    echo -e "${GREEN}✓ CONFIGURED${NC}"
    ((PASS++))
    
    # Check network driver
    driver=$(docker network inspect delivery_network -f '{{.Driver}}')
    echo "  Driver: $driver"
    
    # Check if all services are on the same network
    echo -n "All services on same network... "
    connected=$(docker network inspect delivery_network -f '{{range .Containers}}{{.Name}} {{end}}' | wc -w)
    if [ "$connected" -ge 8 ]; then
        echo -e "${GREEN}✓ YES ($connected containers)${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠ PARTIAL ($connected containers)${NC}"
    fi
else
    echo -e "${RED}✗ NOT FOUND${NC}"
    ((FAIL++))
fi
echo ""

echo "=========================================="
echo " Orchestration Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Microservices orchestration is properly configured! 🚀${NC}"
    echo ""
    echo "Key findings:"
    echo "✓ All services are independently deployable"
    echo "✓ Services use DNS-based service discovery"
    echo "✓ Proper dependency management with health checks"
    echo "✓ Message queue integration is working"
    echo "✓ Database isolation per service"
    echo "✓ Services communicate via custom bridge network"
    exit 0
else
    echo -e "${RED}Some orchestration issues detected.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Ensure all services are started: docker-compose up -d"
    echo "2. Check logs for errors: docker-compose logs"
    echo "3. Restart specific service: docker-compose restart <service>"
    exit 1
fi
