# Deployment Guide

This guide covers deploying the Distributed Parcel Delivery System using Docker Compose or Kubernetes.

## Prerequisites

- Docker and Docker Compose (for Docker deployment)
- Kubernetes cluster (minikube, kind, or cloud provider) and kubectl (for Kubernetes deployment)
- Node.js 18+ (for local development)

## Docker Compose Deployment

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd distributed-parcel-delivery-system
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   cp .env.example .env  # If exists, or create manually
   ```

   Required environment variables:
   - `DB_PASSWORD`: PostgreSQL password (default: YourStrongPassword123)
   - `JWT_SECRET`: Secret key for JWT tokens (default: supersecretkey123)
   - `CHAPA_SECRET_KEY`: Chapa payment gateway secret key

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - API Gateway (via Nginx): http://localhost/api
   - RabbitMQ Management UI: http://localhost:15672 (guest/guest)
   - User Service: http://localhost:3001
   - Order Service: http://localhost:3002
   - Payment Service: http://localhost:3003

### Service Health Checks

```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs -f user-service
docker-compose logs -f order-service
docker-compose logs -f payment-service
docker-compose logs -f notification-service
```

### Stopping Services

```bash
docker-compose down
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster running
- kubectl configured
- Docker images built (or available in a registry)

### Step 1: Build Docker Images

```bash
# Build all images
./scripts/build-all.sh

# Or manually:
docker build -t user-service:latest ./user-service
docker build -t order-service:latest ./order-service
docker build -t payment-service:latest ./payment-service
docker build -t notification-service:latest ./notification-service
docker build -t api-gateway:latest ./api-gateway
docker build -t frontend:latest ./frontend
```

### Step 2: Load Images into Cluster (Local Clusters)

**For minikube:**
```bash
minikube image load user-service:latest
minikube image load order-service:latest
minikube image load payment-service:latest
minikube image load notification-service:latest
minikube image load api-gateway:latest
minikube image load frontend:latest
```

**For kind:**
```bash
kind load docker-image user-service:latest
kind load docker-image order-service:latest
kind load docker-image payment-service:latest
kind load docker-image notification-service:latest
kind load docker-image api-gateway:latest
kind load docker-image frontend:latest
```

### Step 3: Deploy to Kubernetes

```bash
# Deploy all resources
./scripts/deploy-k8s.sh

# Or manually:
kubectl apply -k k8s/
```

### Step 4: Verify Deployment

```bash
# Check all pods
kubectl get pods -n delivery-system

# Check services
kubectl get svc -n delivery-system

# Check logs
kubectl logs -f deployment/user-service -n delivery-system
kubectl logs -f deployment/order-service -n delivery-system
```

### Step 5: Access the Application

**Port Forwarding:**
```bash
# Frontend
kubectl port-forward svc/frontend 5173:5173 -n delivery-system

# API Gateway via Nginx
kubectl port-forward svc/nginx 80:80 -n delivery-system

# RabbitMQ Management
kubectl port-forward svc/rabbitmq 15672:15672 -n delivery-system
```

**Using LoadBalancer (if available):**
```bash
# Get external IP
kubectl get svc nginx -n delivery-system
```

## End-to-End Testing

### 1. User Registration

```bash
curl -X POST http://localhost/api/users/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+251911111111",
    "user_role": "CUSTOMER"
  }'
```

### 2. User Login

```bash
curl -X POST http://localhost/api/users/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "password123"
  }'
```

Save the `token` from the response.

### 3. Create Order

```bash
curl -X POST http://localhost/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "priority": "STANDARD",
    "serviceType": "DOOR_TO_DOOR",
    "addresses": [
      {
        "addressType": "PICKUP",
        "contactName": "John Doe",
        "contactPhone": "+251911111111",
        "streetAddress": "123 Main St",
        "subcity": "Bole",
        "kebele": "Kebele 01"
      },
      {
        "addressType": "DELIVERY",
        "contactName": "Jane Doe",
        "contactPhone": "+251922222222",
        "streetAddress": "456 Oak Ave",
        "subcity": "Megenagna",
        "kebele": "Kebele 02"
      }
    ],
    "parcels": [
      {
        "description": "Electronics",
        "weightKg": 2.5,
        "category": "ELECTRONICS",
        "isFragile": true
      }
    ]
  }'
```

Save the `orderId` from the response.

### 4. Initiate Payment

```bash
curl -X POST http://localhost/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "<ORDER_ID>",
    "first_name": "John",
    "last_name": "Doe",
    "email": "customer@test.com",
    "phone_number": "+251911111111",
    "amount": 150
  }'
```

### 5. Verify Order Status

```bash
curl -X GET http://localhost/api/orders/<ORDER_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## Troubleshooting

### Database Connection Issues

**Docker Compose:**
```bash
# Check database logs
docker-compose logs db-user
docker-compose logs db-order
docker-compose logs db-payment

# Verify database is accessible
docker-compose exec db-user psql -U delivery_user -d user_service_db
```

**Kubernetes:**
```bash
# Check database pods
kubectl get pods -n delivery-system | grep db

# Check database logs
kubectl logs <db-pod-name> -n delivery-system
```

### RabbitMQ Connection Issues

**Docker Compose:**
```bash
# Check RabbitMQ logs
docker-compose logs rabbitmq

# Access RabbitMQ Management UI
open http://localhost:15672
```

**Kubernetes:**
```bash
# Check RabbitMQ pod
kubectl get pods -n delivery-system | grep rabbitmq

# Port forward to access management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n delivery-system
```

### Service Communication Issues

1. **Check service logs** for connection errors
2. **Verify service endpoints** are accessible
3. **Check network policies** (if using Kubernetes)
4. **Verify environment variables** are set correctly

### Frontend Not Loading

1. **Check frontend logs**
2. **Verify API endpoints** in `frontend/src/lib/axios.ts`
3. **Check CORS settings** in API Gateway
4. **Verify authentication token** is being sent

## Production Considerations

1. **Secrets Management**: Use Kubernetes Secrets or external secret management (e.g., HashiCorp Vault)
2. **Database Backups**: Set up regular backups for PostgreSQL databases
3. **Monitoring**: Add monitoring and logging (e.g., Prometheus, Grafana, ELK stack)
4. **Scaling**: Configure horizontal pod autoscaling for services
5. **SSL/TLS**: Set up ingress with SSL certificates
6. **Resource Limits**: Adjust resource requests/limits based on load
7. **High Availability**: Use multiple replicas and database replication

## Cleanup

**Docker Compose:**
```bash
docker-compose down -v  # Remove volumes too
```

**Kubernetes:**
```bash
kubectl delete -k k8s/
# Or
kubectl delete namespace delivery-system
```

