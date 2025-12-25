#!/bin/bash
# Script to test CI pipeline locally

echo "🧪 Testing CI Pipeline Locally..."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in backend directory. Run from backend/ folder."
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo "📦 Step 1/5: Installing dependencies..."
if npm ci; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 2: Lint
echo "🔍 Step 2/5: Running ESLint..."
if npm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
fi
echo ""

# Step 3: Type check and build
echo "🔨 Step 3/5: Type checking and building..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Step 4: Run tests
echo "🧪 Step 4/5: Running tests..."
if npm test -- --coverage; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi
echo ""

# Step 5: Security audit
echo "🔒 Step 5/5: Running security audit..."
npm audit --audit-level=moderate
AUDIT_EXIT=$?
if [ $AUDIT_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ No vulnerabilities found${NC}"
elif [ $AUDIT_EXIT -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Low vulnerabilities found (continuing)${NC}"
else
    echo -e "${RED}❌ High/Critical vulnerabilities found${NC}"
    echo "Run 'npm audit fix' to attempt automatic fixes"
fi
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}🎉 All CI checks passed locally!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Commit your changes"
echo "  2. Push to GitHub"
echo "  3. CI pipeline will run automatically"
echo ""
