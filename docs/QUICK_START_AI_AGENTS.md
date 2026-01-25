# Quick Start: Yosemite Trail Collection with AI Agents

## 🎯 What You're About to Do

Run two AI agents that will:
1. Fetch Yosemite trails from OpenStreetMap
2. Validate data quality with AI
3. Insert high-quality trails to your database

**Expected cost:** ~$2-4 for Yosemite
**Expected trails:** 50-100 high-quality trails

---

## ⚡ Quick Start (3 Steps)

### Step 1: Get OpenRouter API Key (2 minutes)

1. Visit: [https://openrouter.ai/](https://openrouter.ai/)
2. Sign up (free)
3. Go to [https://openrouter.ai/credits](https://openrouter.ai/credits)
4. Add $5 credits (should last for ~1,500 trails)
5. Get API key from [https://openrouter.ai/keys](https://openrouter.ai/keys)

### Step 2: Add API Key to Environment

Open `.env.local` and add:

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

Or use terminal:

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxxxxxxxxxx"
```

### Step 3: Run the Agents

**Dry run first (no database changes):**

```bash
npm run collect:yosemite
```

This shows what would be inserted without actually writing to the database.

**Live run (inserts to database):**

```bash
npm run collect:yosemite:live
```

This actually inserts trails to your database.

---

## 📊 What You'll See

### Phase 1: Collection (~1-2 minutes)
```
🔍 Querying OSM for trails in Yosemite National Park...
✓ Found 150 trail elements from OSM

🧠 Using AI to parse 150 OSM elements...
  Processing batch 1/15...
    ✓ Extracted 8 trails (cost: $0.0012)
```

### Phase 2: Validation (~3-5 minutes)
```
🧠 AI validating trails...

  [1/98] Validating: Half Dome Trail
    Quality Score: 95/100 | Cost: $0.0023
    ✅ VALID - Added to database queue
```

### Phase 3: Database Insertion (~30 seconds)
```
💾 PHASE 3: DATABASE INSERTION

  Batch 1/2 (50 trails)...
    ✅ Inserted: Half Dome Trail (quality: 95/100)
    ✅ Inserted: Mist Trail (quality: 88/100)
    ⏭️  Skipped (duplicate): Vernal Fall Trail
```

### Final Summary
```
✅ COLLECTION COMPLETE

📊 Final Results:
   - Collected: 98 trails
   - Validated: 87 trails
   - High Quality: 65 trails
   - Inserted: 62 trails
   - Skipped (duplicates): 3 trails
   - Failed: 0 trails

💰 Total Cost: ~$2.34
```

---

## 🎉 Success!

After running, you should have:
- ✅ 50-100+ Yosemite trails in your database
- ✅ Each with GPS coordinates, elevation, difficulty
- ✅ Quality scores 50-100/100
- ✅ Spent ~$2-4 total

---

## 🔍 Verify Results

Check your database:

```bash
npm run db:studio
```

Look for trails with:
- `parkName = "Yosemite National Park"`
- `sourceUrl` starting with "openstreetmap.org"
- `lastEnriched` = today's date

---

## 🚀 Next Steps

1. **Add more parks** - Modify the script for Grand Canyon, Zion, etc.
2. **Lower quality threshold** - Get more trails (set `minQualityScore: 40`)
3. **Add elevation profiles** - Integrate USGS Elevation API
4. **Schedule updates** - Run weekly to get new trails

---

## ❓ Troubleshooting

**"OPENROUTER_API_KEY not set"**
- Make sure you added it to `.env.local`
- Or export it in your terminal

**"Insufficient credits"**
- Add more at [https://openrouter.ai/credits](https://openrouter.ai/credits)

**No trails found**
- OSM might be slow, try again
- Check internet connection

**Cost too high**
- Use dry run first to estimate
- Lower `minQualityScore` to process fewer trails
- Switch validation agent to `gpt-4o-mini` (less accurate but cheaper)

---

## 📚 Full Documentation

See [AI_AGENTS_SETUP.md](./AI_AGENTS_SETUP.md) for:
- Detailed architecture
- Customization options
- Quality scoring explanation
- File structure
- Advanced usage

---

**Ready? Let's collect some trails!** 🏔️

```bash
npm run collect:yosemite
```
