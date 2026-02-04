#!/bin/bash

# Production Setup Script
# This script helps configure everything for production deployment

set -e

echo "======================================"
echo "Production Setup Script"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking Prerequisites${NC}"
echo ""

if ! command -v git &> /dev/null; then
    echo "Git is not installed"
    exit 1
fi
echo "Git installed"

if ! command -v node &> /dev/null; then
    echo "Node.js is not installed"
    exit 1
fi
echo "Node.js installed"

# Step 2: Ensure code is committed
echo ""
echo -e "${YELLOW}Step 2: Verify Git Repository${NC}"
echo ""

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Not a git repository"
    exit 1
fi
echo "Git repository found"

# Step 3: Build the project
echo ""
echo -e "${YELLOW}Step 3: Building Project${NC}"
echo ""

npm run vercel-build
echo "Build completed"

echo ""
echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Push to GitHub"
echo "2. Deploy to Vercel with environment variables"
echo "3. Configure Stripe Webhook"
echo "4. Test the deployment"
echo ""
