#!/bin/bash

set -e

echo "🔨 Building all Docker images..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${YELLOW}Building user-service...${NC}"
docker build -t user-service:latest ./user-service

echo -e "${YELLOW}Building order-service...${NC}"
docker build -t order-service:latest ./order-service

echo -e "${YELLOW}Building payment-service...${NC}"
docker build -t payment-service:latest ./payment-service

echo -e "${YELLOW}Building notification-service...${NC}"
docker build -t notification-service:latest ./notification-service

echo -e "${YELLOW}Building api-gateway...${NC}"
docker build -t api-gateway:latest ./api-gateway

echo -e "${YELLOW}Building frontend...${NC}"
docker build -t frontend:latest ./frontend

echo -e "${GREEN}✅ All images built successfully!${NC}"

