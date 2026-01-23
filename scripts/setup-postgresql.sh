#!/bin/bash

# PostgreSQL Migration Setup Script
# This script guides you through the migration process

set -e

echo "🚀 HikeSim PostgreSQL Migration Setup"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Check Prerequisites${NC}"
echo ""

# Check if SQLite database exists
if [ -f "prisma/dev.db" ]; then
    SIZE=$(du -h prisma/dev.db | cut -f1)
    echo -e "${GREEN}✅ SQLite database found (${SIZE})${NC}"
else
    echo -e "${RED}❌ No SQLite database found${NC}"
    echo "   Nothing to migrate. You can skip to setting up PostgreSQL directly."
    exit 1
fi

# Check if backup directory exists
if [ -d "backup" ]; then
    echo -e "${YELLOW}⚠️  Backup directory already exists${NC}"
    read -p "   Do you want to create a new backup? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf backup
    fi
fi

echo ""
echo -e "${YELLOW}Step 2: Backup SQLite Data${NC}"
echo ""
npm run db:backup

echo ""
echo -e "${GREEN}✅ Backup completed!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Set up Neon PostgreSQL${NC}"
echo ""
echo "Please follow these steps:"
echo "1. Go to: ${GREEN}https://neon.tech${NC}"
echo "2. Sign up for a free account"
echo "3. Create a new project named 'hikesim'"
echo "4. Copy the connection string"
echo ""
read -p "Press Enter when you have your connection string ready..."

echo ""
echo "Please paste your Neon connection string:"
echo "(It should look like: postgresql://user:pass@xxx.neon.tech/neondb?sslmode=require)"
read -r DATABASE_URL

# Validate connection string format
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    echo -e "${RED}❌ Invalid connection string format${NC}"
    exit 1
fi

# Update .env file
echo ""
echo -e "${YELLOW}Step 4: Update Environment Variables${NC}"
echo ""

# Backup existing .env if it exists
if [ -f ".env" ]; then
    cp .env .env.sqlite.backup
    echo -e "${GREEN}✅ Backed up existing .env to .env.sqlite.backup${NC}"
fi

# Create new .env
cat > .env << EOF
# PostgreSQL Database (Neon)
DATABASE_URL="$DATABASE_URL"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-change-me-in-production"

# OpenRouter.ai API Key (for AI features - add later)
# OPENROUTER_API_KEY="sk-or-v1-your-key-here"
EOF

echo -e "${GREEN}✅ Environment variables updated${NC}"

echo ""
echo -e "${YELLOW}Step 5: Create PostgreSQL Schema${NC}"
echo ""

# Remove old migrations
if [ -d "prisma/migrations" ]; then
    rm -rf prisma/migrations
    echo "Removed old SQLite migrations"
fi

# Run migration
npx prisma migrate dev --name init

echo ""
echo -e "${GREEN}✅ Database schema created${NC}"

echo ""
echo -e "${YELLOW}Step 6: Restore Data to PostgreSQL${NC}"
echo ""

npm run db:restore

echo ""
echo -e "${GREEN}✅ Data restored!${NC}"

echo ""
echo -e "${YELLOW}Step 7: Generate Prisma Client${NC}"
echo ""

npx prisma generate

echo ""
echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Start your dev server: ${GREEN}npm run dev${NC}"
echo "2. Test your application"
echo "3. View your database: ${GREEN}npm run db:studio${NC}"
echo ""
echo "Your old SQLite database is still at: ${YELLOW}prisma/dev.db${NC}"
echo "Backup files are in: ${YELLOW}backup/${NC}"
echo ""
