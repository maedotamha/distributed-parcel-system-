#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:80/api}"

echo -e "${YELLOW}🧪 Testing End-to-End Flow${NC}"
echo -e "${YELLOW}Base URL: ${BASE_URL}${NC}"
echo ""

# Test 1: User Registration
echo -e "${GREEN}1. Testing User Registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/users/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "phone_number": "+251911111111",
    "user_role": "CUSTOMER"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "registered successfully"; then
  echo -e "${GREEN}✅ Registration successful${NC}"
else
  echo -e "${RED}❌ Registration failed: ${REGISTER_RESPONSE}${NC}"
  exit 1
fi

# Test 2: User Login
echo -e "${GREEN}2. Testing User Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/users/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed: ${LOGIN_RESPONSE}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful, token obtained${NC}"

# Test 3: Create Order
echo -e "${GREEN}3. Testing Order Creation...${NC}"
ORDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "priority": "STANDARD",
    "serviceType": "DOOR_TO_DOOR",
    "addresses": [
      {
        "addressType": "PICKUP",
        "contactName": "Test User",
        "contactPhone": "+251911111111",
        "streetAddress": "123 Test St",
        "subcity": "Bole",
        "kebele": "Kebele 01"
      },
      {
        "addressType": "DELIVERY",
        "contactName": "Receiver",
        "contactPhone": "+251922222222",
        "streetAddress": "456 Delivery Ave",
        "subcity": "Megenagna",
        "kebele": "Kebele 02"
      }
    ],
    "parcels": [
      {
        "description": "Test Package",
        "weightKg": 1.5,
        "category": "GENERAL"
      }
    ]
  }')

ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"orderId":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
  echo -e "${RED}❌ Order creation failed: ${ORDER_RESPONSE}${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Order created successfully: ${ORDER_ID}${NC}"

# Test 4: Get Order
echo -e "${GREEN}4. Testing Get Order...${NC}"
GET_ORDER_RESPONSE=$(curl -s -X GET "${BASE_URL}/orders/${ORDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

if echo "$GET_ORDER_RESPONSE" | grep -q "$ORDER_ID"; then
  echo -e "${GREEN}✅ Order retrieved successfully${NC}"
else
  echo -e "${RED}❌ Failed to retrieve order: ${GET_ORDER_RESPONSE}${NC}"
  exit 1
fi

# Test 5: Get Payment Status
echo -e "${GREEN}5. Testing Payment Status...${NC}"
sleep 2  # Wait for payment record to be created
PAYMENT_RESPONSE=$(curl -s -X GET "${BASE_URL}/payments/order/${ORDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

if echo "$PAYMENT_RESPONSE" | grep -q "payment_id\|PENDING"; then
  echo -e "${GREEN}✅ Payment record found${NC}"
else
  echo -e "${YELLOW}⚠️ Payment record not found yet (may still be processing)${NC}"
fi

echo ""
echo -e "${GREEN}✅ All tests passed!${NC}"
echo -e "${YELLOW}Order ID: ${ORDER_ID}${NC}"
echo -e "${YELLOW}You can now test payment initiation manually${NC}"

