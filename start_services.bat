@echo off
echo Starting Distributed Parcel Delivery System...

echo Starting User Service (3001)...
start "User Service" cmd /k "cd /d user-service && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Order Service (3002)...
start "Order Service" cmd /k "cd /d order-service && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Payment Service (3003)...
start "Payment Service" cmd /k "cd /d payment-service && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Notification Service...
start "Notification Service" cmd /k "cd /d notification-service && npm run dev"

echo Starting Frontend (5173)...
start "Frontend App" cmd /k "cd /d frontend && npm run dev"


echo.
echo Attempted to start all 5 services.
echo The Frontend should open in your browser shortly (http://localhost:5173).
pause
