#!/bin/bash

# TableScan Production Deployment Script
# This script automates the deployment process for TableScan

set -e  # Exit on any error

echo "🚀 Starting TableScan deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production file not found${NC}"
    echo "Please create .env.production with all required environment variables"
    exit 1
fi

# Load production environment variables
export $(cat .env.production | xargs)

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm ci --production=false

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma migrate deploy

# Build the application
echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build

# Run tests if they exist
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${YELLOW}Running tests...${NC}"
    npm test
fi

# Start the application (or use your deployment platform's start command)
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo "Starting application..."
npm start
