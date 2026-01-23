# PostgreSQL Migration Guide

This guide will walk you through migrating your HikeSim database from SQLite to PostgreSQL using Neon.

## Prerequisites

- Node.js installed
- Current SQLite database at `prisma/dev.db`
- Internet connection

## Step-by-Step Migration Process

### Step 1: Create a Neon PostgreSQL Database

1. **Sign up for Neon** (free tier)
   - Go to: https://neon.tech
   - Click "Sign Up" (use GitHub OAuth for easy setup)
   - Create a new account

2. **Create a new project**
   - After login, click "Create Project"
   - Project name: `hikesim`
   - Region: Choose closest to your location (e.g., `US East (Ohio)` for US)
   - PostgreSQL version: 16 (latest)
   - Click "Create Project"

3. **Get your connection string**
   - After project creation, you'll see a connection string
   - It looks like: `postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - **IMPORTANT:** Copy this connection string - you'll need it in the next step

### Step 2: Update Environment Variables

1. **Update `.env.local`** (or create it if it doesn't exist)
   ```bash
   # Replace with your actual Neon connection string
   DATABASE_URL="postgresql://user:password@your-hostname.neon.tech/neondb?sslmode=require"

   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="dev-secret-change-me"
   ```

2. **Keep your old `.env` file** for SQLite backup (rename it)
   ```bash
   mv .env .env.sqlite.backup
   mv .env.local .env
   ```

### Step 3: Backup Your SQLite Data

Run the backup script to export all your current data:

```bash
# Run backup script
npx tsx scripts/backup-sqlite-data.ts
```

This will create a `backup/` directory with JSON files containing all your data:
- `users.json`
- `hikes.json`
- `training-plans.json`
- `generated-plans.json`
- `verification-tokens.json`

**✅ Verify backup:** Check that `backup/` directory exists and contains JSON files.

### Step 4: Install Dependencies

Make sure you have the latest Prisma client:

```bash
npm install
```

### Step 5: Create PostgreSQL Schema

Reset your migrations and create a new initial migration for PostgreSQL:

```bash
# Remove old SQLite migrations
rm -rf prisma/migrations

# Create new PostgreSQL migration
npx prisma migrate dev --name init

# This will:
# 1. Connect to your Neon database
# 2. Create all tables based on your schema
# 3. Generate a migration file
```

**✅ Verify:** You should see a success message and a new `prisma/migrations/` directory.

### Step 6: Restore Your Data to PostgreSQL

Run the restoration script to import your SQLite data into PostgreSQL:

```bash
npx tsx scripts/restore-to-postgresql.ts
```

This will restore all your data in the correct order (respecting foreign key dependencies).

**✅ Verify:** You should see success messages for each data type restored.

### Step 7: Generate Prisma Client

Regenerate the Prisma client for PostgreSQL:

```bash
npx prisma generate
```

### Step 8: Test the Migration

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test key features:**
   - Login with existing user
   - Browse hikes
   - View training plans
   - Everything should work exactly as before!

3. **Check data in Neon dashboard:**
   - Go to your Neon project
   - Click "Tables" in sidebar
   - You should see all your tables with data

### Step 9: Update Production Config (Later)

When deploying to production:

1. **Vercel Environment Variables:**
   - Go to your Vercel project settings
   - Add `DATABASE_URL` with your Neon production connection string
   - Neon automatically provides different connection strings for dev/prod

2. **Neon Branches:**
   - Create a separate branch for production
   - Use branch-specific connection strings

## Troubleshooting

### Issue: "Connection refused" error

**Solution:**
- Verify your Neon connection string is correct
- Check that `?sslmode=require` is at the end of the URL
- Ensure your IP isn't blocked (Neon allows all IPs by default)

### Issue: "Unique constraint violation" during restore

**Solution:**
- This means data already exists in PostgreSQL
- Reset the database:
  ```bash
  npx prisma migrate reset
  ```
- Then run restore script again

### Issue: Migration fails with "column does not exist"

**Solution:**
- Delete `prisma/migrations/` directory
- Run `npx prisma migrate dev --name init` again
- This creates a fresh migration

### Issue: Data looks wrong or incomplete

**Solution:**
- Check your backup files in `backup/` directory
- Verify JSON files contain your data
- Re-run the restore script

## Rollback to SQLite (if needed)

If something goes wrong and you need to rollback:

1. **Restore old environment:**
   ```bash
   mv .env .env.postgresql.backup
   mv .env.sqlite.backup .env
   ```

2. **Update Prisma schema:**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Regenerate client:**
   ```bash
   npx prisma generate
   npm run dev
   ```

Your SQLite database at `prisma/dev.db` should still be intact!

## Post-Migration Checklist

- [ ] Neon account created
- [ ] Connection string copied
- [ ] SQLite data backed up to `backup/` directory
- [ ] `.env` updated with PostgreSQL connection string
- [ ] Migrations created successfully
- [ ] Data restored to PostgreSQL
- [ ] Prisma client regenerated
- [ ] App tested locally (login, browse hikes, view plans)
- [ ] Old SQLite database kept as backup

## Benefits of PostgreSQL

✅ **Production-ready:** Unlike SQLite, PostgreSQL handles concurrent users
✅ **Scalable:** Supports thousands of simultaneous connections
✅ **Full-text search:** Better search capabilities for hikes
✅ **Advanced features:** JSON queries, full-text search, and more
✅ **Neon-specific:** Autoscaling, branching, point-in-time recovery

## Cost Information

**Neon Free Tier includes:**
- 0.5 GB storage
- 100 hours of compute per month (generous for development)
- Unlimited Postgres databases
- Auto-suspend after 5 minutes of inactivity (saves compute hours)

**When you exceed free tier:**
- Scales automatically
- Pay-as-you-go pricing
- Estimated cost: ~$5-10/month for small production apps

## Next Steps

After successful migration:

1. ✅ Update `package.json` scripts if needed
2. ✅ Commit migration files to git
3. ✅ Set up Neon production branch
4. ✅ Configure Vercel environment variables
5. ✅ Deploy to production

---

**Need help?** Check the Neon documentation: https://neon.tech/docs/introduction
