# Docker Troubleshooting Guide

## Common Docker Issues and Solutions

### Container Won't Start

#### Symptom
Container exits immediately after starting or shows "Exited (1)" status.

#### Diagnosis
```bash
# Check container logs
docker logs <container-name>

# Check last 50 lines
docker-compose logs --tail=50 <service-name>

# Follow logs in real-time
docker-compose logs -f <service-name>
```

#### Common Causes & Solutions

1. **Database Connection Failure**
   - **Cause**: Service starts before database is ready
   - **Solution**: Already fixed with `service_healthy` conditions in docker-compose.yml
   - **Verify**: Check health status with `docker-compose ps`

2. **Port Already in Use**
   - **Cause**: Another process is using the same port
   - **Solution**:
     ```bash
     # Windows: Find process using port
     netstat -ano | findstr :<port>
     taskkill /PID <process-id> /F
     ```

3. **Environment Variable Missing**
   - **Cause**: Required env var not set
   - **Solution**: Check `.env` file exists and has all required variables
   - **Template**: See `.env.template` for reference

4. **Prisma Migration Failure**
   - **Cause**: Database schema mismatch
   - **Solution**:
     ```bash
     # Rebuild the service
     docker-compose build --no-cache <service-name>
     docker-compose up -d <service-name>
     ```

---

### Container Restarts Continuously

#### Symptom
Container shows multiple restarts in `docker-compose ps`

#### Diagnosis
```bash
# Check restart count
docker inspect <container-name> --format='{{.RestartCount}}'

# View full logs including restarts
docker logs <container-name> --since 10m
```

#### Solutions

1. **RabbitMQ Connection Retry Loop**
   - Services automatically retry connection to RabbitMQ
   - **Ensure RabbitMQ is healthy**: `docker-compose ps rabbitmq`
   - **Fix**: Restart RabbitMQ if unhealthy
     ```bash
     docker-compose restart rabbitmq
     ```

2. **Application Crash**
   - Check logs for JavaScript/TypeScript errors
   - Common: Missing dependencies, syntax errors
   - **Fix**: Rebuild container
     ```bash
     docker-compose build --no-cache <service>
     docker-compose up -d <service>
     ```

---

### Health Check Fails

#### Symptom
Container shows "unhealthy" status in `docker-compose ps`

#### Diagnosis
```bash
# Check health check details
docker inspect <container-name> --format='{{json .State.Health}}'

# Manual health check test
docker exec <container-name> wget --spider http://localhost:<port>/health
```

#### Solutions

1. **Service Not Responding**
   - Check if application started correctly
   - View logs: `docker logs <container-name>`
   - Verify PORT environment variable matches EXPOSE in Dockerfile

2. **wget Not Installed**
   - Already fixed in all Dockerfiles
   - If issue persists, rebuild:
     ```bash
     docker-compose build --no-cache
     ```

3. **Health Endpoint Not Ready**
   - Some services need more time to start
   - Check `start_period` in docker-compose.yml (already set to 30-40s)
   - Increase if needed for slow systems

---

### Network Communication Issues

#### Symptom
Services can't communicate with each other, connection refused errors

#### Diagnosis
```bash
# Check network exists
docker network ls | grep delivery_network

# Inspect network
docker network inspect delivery_network

# Test DNS resolution
docker exec <container> getent hosts <service-name>

# Test port connectivity
docker exec <container> nc -zv <service-name> <port>
```

#### Solutions

1. **Network Not Created**
   - **Solution**: Recreate network
     ```bash
     docker network create delivery_network
     docker-compose up -d
     ```

2. **Service Not on Network**
   - **Solution**: Reconnect service
     ```bash
     docker-compose down
     docker-compose up -d
     ```

3. **DNS Resolution Fails**
   - Ensure using service names, not IPs
   - Check docker-compose.yml has all services on `delivery_network`
   - **Fix**: Already configured in updated docker-compose.yml

---

### Build Fails

#### Symptom
`docker-compose build` fails with errors

#### Common Issues

1. **Network Timeout During npm install**
   ```bash
   # Solution: Retry build
   docker-compose build --no-cache <service>
   ```

2. **Prisma Generate Fails**
   - **Cause**: Missing prisma schema
   - **Solution**: Verify `prisma/schema.prisma` exists
   - Check Dockerfile copies prisma folder correctly

3. **Out of Disk Space**
   ```bash
   # Check disk usage
   docker system df

   # Clean up
   docker system prune -a --volumes
   # WARNING: This removes ALL unused containers, images, and volumes
   ```

4. **Context Too Large**
   - **Solution**: Use .dockerignore files (already created)
   - Excluded: node_modules, .git, dist, coverage, etc.

---

### RabbitMQ Issues

#### Symptom
Services can't connect to RabbitMQ or messages not being delivered

#### Diagnosis
```bash
# Check RabbitMQ is healthy
docker-compose ps rabbitmq

# Access management UI
# Open http://localhost:15672
# Login: guest/guest

# Check from container
docker exec <service-container> nc -zv rabbitmq 5672
```

#### Solutions

1. **RabbitMQ Not Ready**
   - Wait for health check to pass (30s start_period)
   - Services auto-retry connection (5s interval)

2. **Connections Not Showing in Management UI**
   - Verify services started after RabbitMQ became healthy
   - Check logs for connection errors
   - Restart services:
     ```bash
     docker-compose restart notification-service user-service order-service payment-service
     ```

3. **Exchange/Queue Not Created**
   - Services create exchange on first connection
   - If missing, restart all services that use RabbitMQ

---

### Database Issues

#### Symptom
Database connection errors, schema not found

#### Diagnosis
```bash
# Check database is healthy
docker-compose ps db-user db-order db-payment

# Connect to database
docker exec -it db-user psql -U delivery_user -d user_service_db

# List tables
\dt
```

#### Solutions

1. **Tables Not Created**
   - Prisma runs migrations on container start
   - Check service logs for Prisma errors
   - **Manual migration**:
     ```bash
     docker exec <service-container> npx prisma db push --accept-data-loss
     ```

2. **Connection Refused**
   - Verify DATABASE_URL environment variable
   - Should use service name: `postgresql://user:pass@db-user:5432/dbname`
   - Check db container is healthy

3. **Authentication Failed**
   - Verify DB_PASSWORD in .env matches docker-compose.yml
   - Default: `YourStrongPassword123`

---

### Frontend Issues

#### Symptom
Frontend not accessible or can't reach API

#### Diagnosis
```bash
# Check frontend is running
docker-compose ps frontend

# Access logs
docker logs frontend-app

# Test API connectivity from frontend container
docker exec frontend-app wget --spider http://api-gateway:8000/api/health
```

#### Solutions

1. **Port 5173 Not Accessible**
   - Verify frontend running: `docker-compose ps frontend`
   - Check port mapping: should show `0.0.0.0:5173->5173/tcp`
   - **Fix**: Ensure Vite runs with `--host` flag (already configured)

2. **CORS Errors**
   - Already configured in nginx.conf
   - If issues persist, check browser console for specific error
   - Verify API calls go through nginx (http://localhost/api/)

3. **Hot Module Reload Not Working**
   - Expected behavior in Docker
   - For development, consider running frontend locally
   - Or use docker volume mount (advanced)

---

### Performance Issues

#### Symptom
Containers using too much CPU/memory or responding slowly

#### Diagnosis
```bash
# Check resource usage
docker stats

# Check individual container
docker stats <container-name>
```

#### Solutions

1. **High Memory Usage**
   - Already configured resource limits in docker-compose.yml
   - Limits: 256M-512M per service
   - Increase if needed in docker-compose.yml

2. **High CPU Usage**
   - Normal during build and initial Prisma migrations
   - If sustained, check logs for errors or infinite loops
   - CPU limits: 0.5-1 CPU per service

3. **Slow Startup**
   - First startup is slow (downloading images, building, migrations)
   - Subsequent startups much faster
   - Health checks account for this with `start_period`

---

## Quick Reference Commands

### Start Everything
```bash
docker-compose up -d
```

### Stop Everything
```bash
docker-compose down
```

### Rebuild and Restart
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### View All Logs
```bash
docker-compose logs -f
```

### View Specific Service
```bash
docker-compose logs -f <service-name>
```

### Check Status
```bash
docker-compose ps
```

### Run Health Check Script
```bash
bash scripts/docker-health-check.sh
```

### Run Orchestration Validation
```bash
bash scripts/verify-orchestration.sh
```

### Clean Everything (Nuclear Option)
```bash
docker-compose down -v  # Removes volumes too
docker system prune -a --volumes  # Removes all Docker resources
# Then rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## Getting Help

If issues persist:

1. **Collect logs**: `docker-compose logs > logs.txt`
2. **Check status**: `docker-compose ps`
3. **Check health**: `bash scripts/docker-health-check.sh`
4. **Docker info**: `docker version` and `docker-compose version`
5. **System resources**: `docker system df`

Share this information when seeking help.
