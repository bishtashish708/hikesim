# 🧪 HikeSim Verification Guide

A complete guide to verify your app is working correctly.

---

## 🚀 Quick Start

### 1. Start the Development Server

```bash
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
- Ready in 2.5s
```

Keep this terminal open while testing.

---

## ✅ Step-by-Step Verification

### Test 1: Check the Main App

**Open in Browser:**
```
http://localhost:3000
```

**What to Look For:**
- ✅ Page loads without errors
- ✅ "HikeSim" branding visible
- ✅ Authentication UI (login/signup tabs)
- ✅ No console errors (open DevTools with F12)

**Expected:** Landing page with auth forms

---

### Test 2: Verify Trail Search API

**Test 2a: Search by Name**
```bash
curl 'http://localhost:3000/api/trails/search?q=angel' | jq
```

**Expected Output:**
```json
{
  "trails": [
    {
      "id": "...",
      "name": "Angel's Landing",
      "distanceMiles": 5.4,
      "elevationGainFt": 1500,
      "difficulty": "Moderate",
      "trailType": "Out & Back",
      "countryCode": "US",
      "stateCode": "UT"
    }
  ],
  "count": 1
}
```

**Test 2b: Filter by Difficulty**
```bash
curl 'http://localhost:3000/api/trails/search?difficulty=Hard' | jq
```

**Expected:** List of hard trails (5 trails)

**Test 2c: Filter by Country**
```bash
curl 'http://localhost:3000/api/trails/search?country=IN' | jq
```

**Expected:** List of trails in India (35 trails)

---

### Test 3: Verify Browse by Region API

**Test 3a: California Trails**
```bash
curl 'http://localhost:3000/api/trails/by-region?country=US&state=CA' | jq
```

**Expected Output:**
```json
{
  "trails": [ /* 12 California trails */ ],
  "groupedByState": {
    "CA": [ /* 12 trails */ ]
  },
  "count": 12
}
```

**Test 3b: All US Trails**
```bash
curl 'http://localhost:3000/api/trails/by-region?country=US' | jq
```

**Expected:** 29 US trails grouped by state

---

### Test 4: Verify Filter by Difficulty API

**Test 4a: Very Hard Trails**
```bash
curl 'http://localhost:3000/api/trails/by-difficulty?level=Very%20Hard' | jq
```

**Expected Output:**
```json
{
  "trails": [ /* 12 very hard trails */ ],
  "groupedByDifficulty": {
    "Easy": [],
    "Moderate": [],
    "Hard": [],
    "Very Hard": [ /* 12 trails */ ]
  },
  "count": 12
}
```

**Test 4b: Easy Trails**
```bash
curl 'http://localhost:3000/api/trails/by-difficulty?level=Easy' | jq
```

**Expected:** 43 easy trails

---

### Test 5: Verify Original Hikes List API

**Test 5a: All Hikes**
```bash
curl 'http://localhost:3000/api/hikes/list' | jq
```

**Expected:** All 64 hikes with metadata

**Test 5b: Filter by Country**
```bash
curl 'http://localhost:3000/api/hikes/list?country=US' | jq
```

**Expected:** 29 US trails

---

### Test 6: Check Data Quality

**Run Validation Script:**
```bash
npm run trails:validate
```

**Expected Output:**
```
==================================================
TRAIL DATA QUALITY REPORT
==================================================

Total Hikes: 64

Data Completeness:
  ✓ With Elevation Data: 24/64 (38%)
  ✓ With Difficulty Rating: 64/64 (100%)
  ✓ With GPS Coordinates: 64/64 (100%)
  ✓ With Trail Type: 64/64 (100%)

Overall Quality Score: 84%

✓ GOOD - Trail data quality is acceptable.
```

**What This Means:**
- ✅ All trails have difficulty ratings
- ✅ All trails have GPS coordinates
- ✅ All trails have trail type metadata
- ⚠️ Some trails missing elevation profiles (normal, can be enriched later)

---

### Test 7: View Database Directly

**Open Prisma Studio:**
```bash
npm run db:studio
```

**What Happens:**
- Browser opens at http://localhost:5555
- You see Prisma Studio interface

**What to Check:**
1. Click on "Hike" model
2. Verify 64 records exist
3. Click on any trail to see full details
4. Check that fields like `difficulty`, `trailType`, `latitude`, `longitude` have values

**Expected:** Clean UI showing all database records

---

### Test 8: Verify Build (No Errors)

**Run Production Build:**
```bash
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (X/X)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size
┌ ○ /                                    XX kB
├ ○ /api/hikes/list                      0 B
├ ○ /api/trails/by-difficulty            0 B
├ ○ /api/trails/by-region                0 B
├ ○ /api/trails/search                   0 B
...
```

**If Build Fails:**
- ❌ Check terminal for TypeScript errors
- ❌ Look for import/export issues
- ❌ Verify all dependencies installed (`npm install`)

---

### Test 9: Check Browser Console

**Steps:**
1. Open http://localhost:3000
2. Press F12 (or Cmd+Option+I on Mac)
3. Click "Console" tab

**What to Look For:**
- ✅ No red errors
- ✅ No warnings about missing dependencies
- ⚠️ Some Next.js dev warnings are normal (hydration notices, etc.)

**Red Flags:**
- ❌ "Failed to fetch"
- ❌ "Module not found"
- ❌ "TypeError" or "ReferenceError"

---

### Test 10: Verify Database Connection

**Check Connection:**
```bash
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"Hike\";"
```

**Expected Output:**
```
count
-------
64
```

**Alternative Test:**
```bash
npx prisma db execute --stdin <<< "SELECT name, difficulty FROM \"Hike\" LIMIT 5;"
```

**Expected:** List of 5 trails with names and difficulty

---

## 📊 Quick Health Check Commands

**Run All Tests at Once:**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run these verification commands
curl -s 'http://localhost:3000/api/trails/search?q=angel' | jq .count
# Expected: 1

curl -s 'http://localhost:3000/api/trails/by-difficulty?level=Easy' | jq .count
# Expected: 43

curl -s 'http://localhost:3000/api/hikes/list' | jq '.items | length'
# Expected: 64

npm run trails:validate
# Expected: 84% quality score
```

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to database"

**Fix:**
```bash
# Check .env file exists
cat .env

# Verify DATABASE_URL is set
grep DATABASE_URL .env

# Regenerate Prisma client
npx prisma generate

# Test connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

---

### Issue: "Port 3000 already in use"

**Fix:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

### Issue: API returns empty array

**Possible Causes:**
1. Database is empty (run `npm run db:seed`)
2. Wrong query parameters
3. Database migration not applied

**Fix:**
```bash
# Check database has data
npx prisma studio

# Re-seed if needed
npm run db:seed

# Apply migrations
npm run db:migrate
```

---

### Issue: Build fails with TypeScript errors

**Fix:**
```bash
# Clean build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## ✅ Final Checklist

Use this checklist to verify everything is working:

- [ ] Dev server starts without errors (`npm run dev`)
- [ ] Main page loads at http://localhost:3000
- [ ] Trail search API returns results
- [ ] Browse by region API works
- [ ] Filter by difficulty API works
- [ ] Original hikes list API works
- [ ] Data quality score is 84%
- [ ] Database has 64 records (Prisma Studio)
- [ ] Build completes successfully (`npm run build`)
- [ ] No console errors in browser

---

## 🎯 Success Criteria

**Your app is working correctly if:**

1. ✅ All API endpoints return JSON data
2. ✅ Data quality score is 84%
3. ✅ Build passes with no TypeScript errors
4. ✅ Database contains 64 trails
5. ✅ All trails have difficulty, type, and coordinates
6. ✅ Search and filtering work correctly

---

## 📞 Need Help?

If any test fails:

1. **Check the terminal** running `npm run dev` for error messages
2. **Check browser console** (F12) for frontend errors
3. **Check database connection** with `npx prisma studio`
4. **Verify environment** with `cat .env`
5. **Rebuild** with `npm run build`

---

## 🚀 Next Steps After Verification

Once all tests pass, you're ready to:

1. **Step 3**: Integrate OpenRouter.ai for AI-powered training plans
2. **Deploy backend** to Railway/Render
3. **Enhance UI** with shadcn/ui components
4. **Add onboarding flow** for new users
5. **Deploy to production** on Vercel

---

**Last Updated:** 2026-01-21
**Status:** All features tested and working ✅
