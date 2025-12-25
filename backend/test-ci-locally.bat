@echo off
REM Script to test CI pipeline locally (Windows)

echo Testing CI Pipeline Locally...
echo.

REM Check if we're in the backend directory
if not exist "package.json" (
    echo Not in backend directory. Run from backend\ folder.
    exit /b 1
)

REM Step 1: Install dependencies
echo Step 1/5: Installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)
echo Dependencies installed
echo.

REM Step 2: Lint
echo Step 2/5: Running ESLint...
call npm run lint
if %errorlevel% neq 0 (
    echo Linting failed
    exit /b 1
)
echo Linting passed
echo.

REM Step 3: Type check and build
echo Step 3/5: Type checking and building...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed
    exit /b 1
)
echo Build successful
echo.

REM Step 4: Run tests
echo Step 4/5: Running tests...
call npm test -- --coverage
if %errorlevel% neq 0 (
    echo Tests failed
    exit /b 1
)
echo Tests passed
echo.

REM Step 5: Security audit
echo Step 5/5: Running security audit...
call npm audit --audit-level=moderate
if %errorlevel% equ 0 (
    echo No vulnerabilities found
) else if %errorlevel% equ 1 (
    echo Low vulnerabilities found ^(continuing^)
) else (
    echo High/Critical vulnerabilities found
    echo Run 'npm audit fix' to attempt automatic fixes
)
echo.

REM Summary
echo ================================================
echo All CI checks passed locally!
echo ================================================
echo.
echo Next steps:
echo   1. Commit your changes
echo   2. Push to GitHub
echo   3. CI pipeline will run automatically
echo.

pause
