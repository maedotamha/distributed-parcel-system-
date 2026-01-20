@echo off
echo Running System Verification...
echo This will simulate a User registering, creating an order, and paying for it.
echo Watch the 'Notification Service' window for email/sms logs!

cd payment-service
npm run verify

pause
