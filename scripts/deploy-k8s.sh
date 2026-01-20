#!/bin/bash

set -e

echo "🚀 Deploying Distributed Parcel Delivery System to Kubernetes"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed. Please install kubectl first.${NC}"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes cluster is accessible${NC}"

# Apply manifests
echo -e "${YELLOW}📦 Applying Kubernetes manifests...${NC}"
kubectl apply -k k8s/

# Wait for databases to be ready
echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=db-user -n delivery-system --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=db-order -n delivery-system --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=db-payment -n delivery-system --timeout=300s || true

# Wait for RabbitMQ to be ready
echo -e "${YELLOW}⏳ Waiting for RabbitMQ to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=rabbitmq -n delivery-system --timeout=300s || true

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check pod status
echo -e "${GREEN}📊 Pod Status:${NC}"
kubectl get pods -n delivery-system

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}To access the application:${NC}"
echo "  - Frontend: kubectl port-forward svc/frontend 5173:5173 -n delivery-system"
echo "  - API Gateway: kubectl port-forward svc/nginx 80:80 -n delivery-system"
echo ""
echo -e "${YELLOW}To check logs:${NC}"
echo "  kubectl logs -f deployment/user-service -n delivery-system"
echo "  kubectl logs -f deployment/order-service -n delivery-system"
echo "  kubectl logs -f deployment/payment-service -n delivery-system"

