# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the distributed parcel delivery system.

## Prerequisites

1. Kubernetes cluster (minikube, kind, or cloud provider)
2. kubectl configured to access your cluster
3. Docker images built and available (either in a registry or loaded into cluster)

## Quick Start

### 1. Build Docker Images

First, build all Docker images:

```bash
# From project root
docker build -t user-service:latest ./user-service
docker build -t order-service:latest ./order-service
docker build -t payment-service:latest ./payment-service
docker build -t notification-service:latest ./notification-service
docker build -t api-gateway:latest ./api-gateway
docker build -t frontend:latest ./frontend
```

### 2. Load Images into Cluster (for local clusters)

If using minikube or kind:

```bash
# For minikube
minikube image load user-service:latest
minikube image load order-service:latest
minikube image load payment-service:latest
minikube image load notification-service:latest
minikube image load api-gateway:latest
minikube image load frontend:latest

# For kind
kind load docker-image user-service:latest
kind load docker-image order-service:latest
kind load docker-image payment-service:latest
kind load docker-image notification-service:latest
kind load docker-image api-gateway:latest
kind load docker-image frontend:latest
```

### 3. Deploy to Kubernetes

Using kubectl:

```bash
# Apply all manifests
kubectl apply -k k8s/

# Or apply individually
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres-user.yaml
kubectl apply -f k8s/postgres-order.yaml
kubectl apply -f k8s/postgres-payment.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/order-service.yaml
kubectl apply -f k8s/payment-service.yaml
kubectl apply -f k8s/notification-service.yaml
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/nginx.yaml
```

### 4. Check Deployment Status

```bash
# Check all pods
kubectl get pods -n delivery-system

# Check services
kubectl get svc -n delivery-system

# Check logs
kubectl logs -f deployment/user-service -n delivery-system
kubectl logs -f deployment/order-service -n delivery-system
kubectl logs -f deployment/payment-service -n delivery-system
```

### 5. Access the Application

For local clusters (minikube/kind):

```bash
# Get nginx service external IP
kubectl get svc nginx -n delivery-system

# If using minikube, create a tunnel
minikube service nginx -n delivery-system

# Or port-forward
kubectl port-forward svc/nginx 80:80 -n delivery-system
```

Then access:
- Frontend: http://localhost:5173 (if port-forwarding frontend service)
- API Gateway via Nginx: http://localhost/api

## Architecture

The deployment includes:

1. **Databases**: PostgreSQL instances for user, order, and payment services
2. **Message Broker**: RabbitMQ for asynchronous communication
3. **Microservices**: User, Order, Payment, and Notification services
4. **API Gateway**: Routes requests to appropriate services
5. **Frontend**: React application
6. **Load Balancer**: Nginx for routing

## Configuration

### Secrets

Update `k8s/secrets.yaml` with your actual secrets before deploying to production:

- Database passwords
- JWT secret
- Chapa payment gateway secret key

### Environment Variables

Service-specific environment variables can be modified in their respective deployment manifests.

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n delivery-system

# Check logs
kubectl logs <pod-name> -n delivery-system
```

### Database Connection Issues

Ensure database pods are running and healthy:

```bash
kubectl get pods -n delivery-system | grep db
```

### RabbitMQ Connection Issues

Check RabbitMQ pod status:

```bash
kubectl logs deployment/rabbitmq -n delivery-system
```

## Cleanup

To remove all resources:

```bash
kubectl delete -k k8s/
# Or
kubectl delete namespace delivery-system
```

