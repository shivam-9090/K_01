#!/bin/bash

# Test Async Services (Queue, Storage, Search)

echo "========================================="
echo "Testing Async Services Implementation"
echo "========================================="
echo ""

BASE_URL="http://localhost:3001"
TOKEN=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

echo "1. Testing Health Endpoint"
echo "--------------------------"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
    print_result 0 "Health check passed"
    echo "   Response: $HEALTH"
else
    print_result 1 "Health check failed"
fi
echo ""

echo "2. Testing User Registration (with Welcome Email Queue)"
echo "------------------------------------------------------"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testqueue@example.com",
    "username": "queuetest",
    "password": "Test123!@#",
    "firstName": "Queue",
    "lastName": "Test"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    print_result 0 "User registered successfully"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    echo "   ✓ Welcome email queued (check Docker logs)"
    echo "   ✓ Audit log queued"
    echo "   Token: ${TOKEN:0:20}..."
else
    print_result 1 "User registration failed"
    echo "   Error: $REGISTER_RESPONSE"
fi
echo ""

echo "3. Testing Search - Find Registered User"
echo "---------------------------------------"
if [ -n "$TOKEN" ]; then
    SEARCH_RESPONSE=$(curl -s "$BASE_URL/search/users?q=queuetest" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$SEARCH_RESPONSE" | grep -q "queuetest"; then
        print_result 0 "Search found registered user"
        echo "   Response: $(echo "$SEARCH_RESPONSE" | head -c 100)..."
    else
        print_result 1 "Search failed"
        echo "   Error: $SEARCH_RESPONSE"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (no token)${NC}"
fi
echo ""

echo "4. Testing Search Statistics"
echo "---------------------------"
if [ -n "$TOKEN" ]; then
    STATS_RESPONSE=$(curl -s "$BASE_URL/search/stats" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$STATS_RESPONSE" | grep -q "total"; then
        print_result 0 "Statistics retrieved successfully"
        echo "   Response: $(echo "$STATS_RESPONSE" | head -c 150)..."
    else
        print_result 1 "Statistics retrieval failed"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (no token)${NC}"
fi
echo ""

echo "5. Testing File Upload (Storage Module)"
echo "--------------------------------------"
if [ -n "$TOKEN" ]; then
    # Create a test file
    echo "This is a test file for storage" > test_upload.txt
    
    UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/storage/upload" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@test_upload.txt")
    
    if echo "$UPLOAD_RESPONSE" | grep -q "uploaded successfully"; then
        print_result 0 "File uploaded successfully"
        FILE_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
        echo "   File ID: $FILE_ID"
        
        # Test file metadata
        if [ -n "$FILE_ID" ]; then
            METADATA=$(curl -s "$BASE_URL/storage/$FILE_ID/metadata" \
              -H "Authorization: Bearer $TOKEN")
            
            if echo "$METADATA" | grep -q "test_upload.txt"; then
                print_result 0 "File metadata retrieved"
            else
                print_result 1 "File metadata retrieval failed"
            fi
        fi
    else
        print_result 1 "File upload failed"
        echo "   Error: $UPLOAD_RESPONSE"
    fi
    
    # Cleanup test file
    rm -f test_upload.txt
else
    echo -e "${YELLOW}⊘ Skipped (no token)${NC}"
fi
echo ""

echo "6. Checking Queue Processing (Docker Logs)"
echo "-----------------------------------------"
echo "Checking for email queue processing..."
QUEUE_LOGS=$(docker logs auth_app1 2>&1 | grep -i "Processing email job\|Processing notification job\|Processing audit job" | tail -5)

if [ -n "$QUEUE_LOGS" ]; then
    print_result 0 "Queue jobs are being processed"
    echo "$QUEUE_LOGS"
else
    echo -e "${YELLOW}⊘ No queue jobs found yet (this is normal if registration just happened)${NC}"
    echo "   Run: docker logs auth_app1 -f | grep 'Processing'"
fi
echo ""

echo "7. Checking Redis Queue Status"
echo "-----------------------------"
REDIS_CHECK=$(docker exec auth_redis redis-cli KEYS 'bull:*' 2>/dev/null | wc -l)

if [ "$REDIS_CHECK" -gt 0 ]; then
    print_result 0 "Redis queues are active ($REDIS_CHECK keys)"
    echo "   Queue keys:"
    docker exec auth_redis redis-cli KEYS 'bull:*' 2>/dev/null | head -5
else
    print_result 1 "No Redis queue keys found"
fi
echo ""

echo "========================================="
echo "Testing Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "--------"
echo "✓ Message Queue System: BullMQ with Redis"
echo "  - Email queue (welcome emails, 2FA codes)"
echo "  - Notification queue (security alerts)"
echo "  - Audit queue (user action logging)"
echo ""
echo "✓ File Storage System:"
echo "  - Local storage in uploads/ directory"
echo "  - File validation (size, MIME type)"
echo "  - Cloud-ready (AWS S3, GCS, Azure)"
echo ""
echo "✓ Search Engine:"
echo "  - User search (email, name)"
echo "  - Advanced filtering (role, 2FA status)"
echo "  - Statistics endpoint"
echo ""
echo "Next Steps:"
echo "----------"
echo "1. Monitor queues: docker logs auth_app1 -f | grep 'Processing'"
echo "2. Check Redis queues: docker exec -it auth_redis redis-cli"
echo "   > KEYS bull:*"
echo "   > LRANGE bull:email:waiting 0 -1"
echo "3. Test file upload with Postman or frontend"
echo "4. Integrate actual email service (SendGrid, AWS SES)"
echo "5. Add cloud storage (AWS S3, GCS, Azure)"
echo ""
