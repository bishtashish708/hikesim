# What Changed: SQLite → PostgreSQL Migration

## Files Modified ✏️

### 1. `prisma/schema.prisma`
**Before:**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Account {
  // ...
  refresh_token      String?
  access_token       String?
  id_token           String?
  // ...
}
```

**After:**
```prisma
datasource db {
  provider = "postgresql"  // ← Changed
  url      = env("DATABASE_URL")
}

model Account {
  // ...
  refresh_token      String? @db.Text  // ← Added @db.Text
  access_token       String? @db.Text  // ← Added @db.Text
  id_token           String? @db.Text  // ← Added @db.Text
  // ...
}
```

**Why?**
- PostgreSQL requires `@db.Text` for long OAuth tokens (SQLite auto-handles this)

---

### 2. `.env`
**Before:**
```bash
DATABASE_URL="file:./prisma/dev.db"
```

**After:**
```bash
DATABASE_URL="postgresql://user:pass@hostname.neon.tech/neondb?sslmode=require"
```

**Why?**
- PostgreSQL connection requires network URL instead of file path
- `sslmode=require` ensures encrypted connections

---

### 3. `package.json` - New Scripts
**Added:**
```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:backup": "tsx scripts/backup-sqlite-data.ts",
    "db:restore": "tsx scripts/restore-to-postgresql.ts"
  }
}
```

**Why?**
- Convenient commands for migration workflow
- Easy database management

---

## New Files Created 📄

### 1. `scripts/backup-sqlite-data.ts`
- Exports all SQLite data to JSON files
- Preserves relationships and structure
- Creates `backup/` directory with all data

### 2. `scripts/restore-to-postgresql.ts`
- Imports JSON data into PostgreSQL
- Handles foreign key dependencies
- Preserves IDs and relationships

### 3. `scripts/setup-postgresql.sh`
- Automated migration wizard
- Interactive prompts
- Validates each step

### 4. `MIGRATION_GUIDE.md`
- Complete step-by-step instructions
- Troubleshooting section
- Rollback instructions

### 5. `QUICK_START.md`
- Fast reference guide
- Quick commands
- Success checklist

### 6. `.env.local` (template)
- Example environment file
- Shows correct format
- Includes all required variables

---

## Database Changes 🗄️

### Connection Type
| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| **Type** | File-based | Network-based |
| **Location** | `prisma/dev.db` | Neon cloud |
| **Concurrent Users** | Limited (file locks) | Unlimited |
| **Backups** | Copy file | Neon auto-backup |
| **Scaling** | Single machine | Cloud distributed |

### Data Types
| Field | SQLite | PostgreSQL |
|-------|--------|------------|
| **OAuth tokens** | TEXT (auto) | TEXT (explicit `@db.Text`) |
| **IDs** | TEXT (cuid) | TEXT (cuid) - same |
| **Dates** | INTEGER | TIMESTAMP |
| **JSON** | TEXT | JSONB (native) |

---

## What Stayed the Same ✅

- **Schema structure:** All models remain identical
- **Relationships:** Foreign keys work the same
- **Prisma Client API:** Your code doesn't change!
- **Queries:** Same syntax, same methods
- **Data:** All data preserved exactly

---

## Migration Process Summary

```
1. Backup SQLite data     → backup/*.json
2. Update schema.prisma   → provider = "postgresql"
3. Create new migrations  → prisma/migrations/
4. Restore data           → PostgreSQL on Neon
5. Generate client        → @prisma/client
6. Test app               → Everything works!
```

---

## Performance Differences

### SQLite (Before)
- ✅ Fast for single user
- ✅ No network latency
- ❌ File locks with multiple users
- ❌ Limited concurrent writes
- ❌ Not production-ready

### PostgreSQL (After)
- ✅ Production-ready
- ✅ Handles 1000+ concurrent users
- ✅ Advanced querying (full-text search)
- ✅ Auto-backups via Neon
- ✅ Scalable (Neon autoscaling)
- ⚠️ ~20-50ms network latency (negligible)

---

## Cost Comparison

| Tier | SQLite | PostgreSQL (Neon) |
|------|--------|-------------------|
| **Development** | Free | Free (0.5GB, 100hrs/mo) |
| **Production** | Not viable | ~$5-20/mo (autoscaling) |
| **Hosting** | Needs file storage | Managed by Neon |

---

## Rollback (if needed)

To revert to SQLite:

1. **Restore `.env`:**
   ```bash
   mv .env.sqlite.backup .env
   ```

2. **Update schema:**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. **Regenerate client:**
   ```bash
   npx prisma generate
   ```

Your SQLite database at `prisma/dev.db` is unchanged!

---

## Next Steps After Migration

1. ✅ Test all features locally
2. ✅ Keep `backup/` directory as safety net
3. ✅ Set up production Neon branch
4. ✅ Configure Vercel environment variables
5. ✅ Deploy to production

---

## Questions?

- **Neon Docs:** https://neon.tech/docs
- **Prisma PostgreSQL Guide:** https://www.prisma.io/docs/concepts/database-connectors/postgresql
- **Migration Guide:** See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
