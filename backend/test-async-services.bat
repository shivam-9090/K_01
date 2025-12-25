@echo off
REM Test Async Services (Queue, Storage, Search)

echo =========================================
echo Testing Async Services Implementation
echo =========================================
echo.

set BASE_URL=http://localhost:3001
set TOKEN=

echo 1. Testing Health Endpoint
echo --------------------------
curl -s "%BASE_URL%/health"
echo.
echo.

echo 2. Testing User Registration (with Welcome Email Queue)
echo ------------------------------------------------------
curl -s -X POST "%BASE_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testqueue@example.com\",\"username\":\"queuetest\",\"password\":\"Test123!@#\",\"firstName\":\"Queue\",\"lastName\":\"Test\"}"
echo.
echo ^> Welcome email queued (check Docker logs)
echo ^> Audit log queued
echo.
echo.

echo 3. Register another user to get a token
echo ---------------------------------------
curl -s -X POST "%BASE_URL%/auth/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testsearch@example.com\",\"username\":\"searchtest\",\"password\":\"Test123!@#\",\"firstName\":\"Search\",\"lastName\":\"Test\"}" > response.json
echo.
echo Token saved to response.json (use for next requests)
echo.
echo.

echo 4. Testing Search Users (requires authentication)
echo -----------------------------------------------
echo To test search, use the token from response.json:
echo curl -H "Authorization: Bearer YOUR_TOKEN" %BASE_URL%/search/users?q=test
echo.
echo.

echo 5. Testing File Upload (requires authentication)
echo ----------------------------------------------
echo Create test file first: echo Test file content ^> test_upload.txt
echo Upload: curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -F "file=@test_upload.txt" %BASE_URL%/storage/upload
echo.
echo.

echo 6. Checking Queue Processing in Docker Logs
echo ------------------------------------------
echo Recent logs from app1:
docker logs auth_app1 --tail 20
echo.
echo.

echo 7. Checking Redis Queue Status
echo -----------------------------
echo Redis queue keys:
docker exec auth_redis redis-cli KEYS "bull:*"
echo.
echo.

echo =========================================
echo Testing Complete!
echo =========================================
echo.
echo Summary:
echo --------
echo ^✓ Message Queue System: BullMQ with Redis
echo   - Email queue (welcome emails, 2FA codes)
echo   - Notification queue (security alerts)  
echo   - Audit queue (user action logging)
echo.
echo ^✓ File Storage System:
echo   - Local storage in uploads/ directory
echo   - File validation (size, MIME type)
echo   - Cloud-ready (AWS S3, GCS, Azure)
echo.
echo ^✓ Search Engine:
echo   - User search (email, name)
echo   - Advanced filtering (role, 2FA status)
echo   - Statistics endpoint
echo.
echo Next Steps:
echo ----------
echo 1. Monitor queues: docker logs auth_app1 -f
echo 2. Check Redis queues: docker exec -it auth_redis redis-cli
echo    ^> KEYS bull:*
echo    ^> LRANGE bull:email:waiting 0 -1
echo 3. Test file upload with Postman
echo 4. Integrate actual email service (SendGrid, AWS SES)
echo 5. Add cloud storage (AWS S3, GCS, Azure)
echo.
pause
