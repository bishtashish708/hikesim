# 🚀 Ready to Run: Trail Collection Summary

## ✅ What's Been Set Up

You now have a complete AI agent system ready to collect trails from the top 10 most visited US National Parks.

### ✅ Configuration Complete
- ✅ OpenRouter API key configured in `.env`
- ✅ Database connected (PostgreSQL/Neon)
- ✅ All dependencies installed
- ✅ TypeScript compilation passing
- ⏳ NPS API key placeholder added (optional - can add later)

### ✅ Parks Configured (Top 10)
1. Great Smoky Mountains National Park (grsm)
2. Grand Canyon National Park (grca)
3. Zion National Park (zion)
4. Rocky Mountain National Park (romo)
5. Acadia National Park (acad)
6. Grand Teton National Park (grte)
7. Olympic National Park (olym)
8. Yellowstone National Park (yell)
9. Yosemite National Park (yose)
10. Glacier National Park (glac)

### ✅ Files Created
```
src/agents/
├── base/
│   ├── types.ts                    # TypeScript interfaces
│   ├── utils.ts                    # Helper functions (FIXED)
│   └── openrouter-client.ts        # OpenRouter API client
├── collector/
│   ├── agent.ts                    # Data Collection Agent (GPT-4o Mini)
│   └── osm-client.ts               # OpenStreetMap client (ALL 10 PARKS ADDED)
├── validator/
│   └── agent.ts                    # Data Validation Agent (Claude Sonnet 4.5)
└── orchestrator.ts                 # Main coordinator (FIXED)

scripts/
├── collect-yosemite.ts             # Single park script
└── collect-top-10-parks.ts         # All 10 parks script (NEW!)

docs/
├── AI_AGENTS_SYSTEM.md             # System architecture
├── AI_AGENTS_SETUP.md              # Setup guide
├── QUICK_START_AI_AGENTS.md        # Quick start
├── NPS_API_INTEGRATION.md          # NPS API guide (NEW!)
├── TOP_10_PARKS_COLLECTION.md      # Top 10 parks guide (NEW!)
└── READY_TO_RUN.md                 # This file
```

---

## 🎯 Quick Start (3 Options)

### Option 1: Test with Yosemite (Recommended First)

```bash
# Dry run (preview only, no database changes)
npm run collect:yosemite
```

**Expected:**
- 50-100 trails collected
- Quality scores displayed
- Cost: ~$2-4
- Time: ~5-10 minutes
- NO database changes

```bash
# Live run (inserts to database)
npm run collect:yosemite:live
```

### Option 2: Collect All Top 10 Parks (Full Collection)

```bash
# Dry run (preview all parks)
npm run collect:top10
```

**Expected:**
- 10,000-15,000 trails collected
- All 10 parks processed
- Cost: ~$20-40
- Time: ~50-130 minutes (0.8-2.2 hours)
- NO database changes

```bash
# Live run (inserts to database)
npm run collect:top10:live
```

### Option 3: Specific Park Only

```bash
# By park code
npm run collect:top10 -- --park=grca

# By partial name
npm run collect:top10:live -- --park=glacier
```

---

## 💰 Cost Estimates

### Per Trail
- Collection (GPT-4o Mini): $0.0004
- Validation (Claude Sonnet 4.5): $0.0015
- **Total:** $0.0019 per trail

### Yosemite (~80 trails)
- Collection: ~$0.40
- Validation: ~$1.60
- **Total:** ~$2-4

### All 10 Parks (~12,000 trails)
- Collection: ~$5-7
- Validation: ~$18-22
- **Total:** ~$23-30

---

## 📊 What You'll See

### Phase 1: Collection
```
📥 PHASE 1: DATA COLLECTION
────────────────────────────────────────────────────────────────────────────────
🔍 Querying OSM for trails in Yosemite National Park...
✓ Found 150 trail elements from OSM

🧠 Using AI to parse 150 OSM elements...
  Processing batch 1/15...
    ✓ Extracted 8 trails (cost: $0.0012)
  Processing batch 2/15...
    ✓ Extracted 10 trails (cost: $0.0015)

💰 Total AI cost: $0.0234
✅ Collection complete! Found 98 trails in 45.2s
```

### Phase 2: Validation
```
✅ PHASE 2: AI VALIDATION
────────────────────────────────────────────────────────────────────────────────
🧠 AI validating trails...

  [1/98] Validating: Half Dome Trail
    Quality Score: 95/100 | Cost: $0.0023
    ✅ VALID - Added to database queue

  [2/98] Validating: Mist Trail
    Quality Score: 88/100 | Cost: $0.0019
    ✅ VALID - Added to database queue

✅ Validation complete in 180.5s
💰 Total AI cost: $2.1450
📊 Results:
   - Valid: 87
   - Invalid: 11
   - Average quality score: 72.3/100
```

### Phase 3: Database Insertion
```
💾 PHASE 3: DATABASE INSERTION
────────────────────────────────────────────────────────────────────────────────

Inserting 65 trails in batches of 50...

  Batch 1/2 (50 trails)...
    ✅ Inserted: Half Dome Trail (quality: 95/100)
    ✅ Inserted: Mist Trail (quality: 88/100)
    ⏭️  Skipped (duplicate): Vernal Fall Trail

✅ Batch insertion complete!
   - Inserted: 62
   - Skipped: 3
   - Failed: 0
```

---

## 🔍 How to Verify Results

### Check Database
```bash
npm run db:studio
```

Then filter by:
- `lastEnriched` = today's date
- `sourceUrl` contains "openstreetmap.org"
- `isSeed` = false

### Check Data Files
All collected data is saved to:
```
data/
├── raw/                     # Raw collected trails
├── validated/               # Validated trails with scores
└── results/                 # Database insertion results
```

---

## 🛡️ Safety Features

### ✅ Dry Run Mode
- Always test with dry run first
- Preview data before inserting
- See quality scores and costs

### ✅ Duplicate Detection
- Checks database before inserting
- Matches by: name + parkName
- Skips duplicates automatically

### ✅ Quality Filtering
- Default threshold: 50/100
- Only high-quality trails inserted
- Configurable in scripts

### ✅ Rate Limiting
- 2-second delay between parks
- Batch processing (50 trails at a time)
- Respects OSM API fair use

---

## ⚙️ Configuration Options

### Adjust Quality Threshold

In `scripts/collect-yosemite.ts` or `scripts/collect-top-10-parks.ts`:

```typescript
{
  minQualityScore: 50,  // Change to 40 for more trails, 60 for higher quality
}
```

### Change Batch Size

```typescript
{
  batchSize: 50,  // Increase to 100 for faster insertion
}
```

### Switch AI Models

**Collection Agent** (`src/agents/collector/agent.ts`):
```typescript
private model = 'openai/gpt-4o-mini';  // Fast and cheap
// Options: openai/gpt-4o (better quality, more expensive)
```

**Validation Agent** (`src/agents/validator/agent.ts`):
```typescript
private model = 'anthropic/claude-sonnet-4-5';  // Best reasoning
// Options: openai/gpt-4o-mini (cheaper but less accurate)
```

---

## 🚨 Important Notes

### Before Running Live
1. ✅ **Test with dry run first** - Always preview data
2. ✅ **Check OpenRouter credits** - Ensure you have $30+ for all 10 parks
3. ✅ **Backup database** - Run `npm run db:backup` (optional but recommended)
4. ✅ **Check disk space** - Ensure 1GB+ free for data files

### During Collection
- Don't interrupt the process (Ctrl+C to cancel if needed)
- Monitor OpenRouter dashboard for costs
- Check console output for quality scores
- All data is saved to `data/` directory for review

### After Collection
- Review quality scores in console output
- Check for duplicates in database
- Verify trail data in Prisma Studio
- Test your app with the new trails

---

## ❓ Troubleshooting

### "OPENROUTER_API_KEY not set"
Your key is already set in `.env` - you're good to go!

### "No trails found"
- OSM might be slow, try again
- Check internet connection
- Verify bounding box in `src/agents/collector/osm-client.ts`

### "Insufficient credits"
- Add more at https://openrouter.ai/credits
- Recommend $30+ for all 10 parks

### "Cost too high"
- Use dry run first to estimate
- Lower `minQualityScore` to 40
- Process one park at a time

### TypeScript errors
- All import issues have been fixed
- Run `npm run collect:yosemite` to test

---

## 🎉 You're Ready!

Everything is configured and ready to run. Here's the recommended workflow:

### Step 1: Test with Yosemite (5 minutes)
```bash
npm run collect:yosemite
```
Review output, check quality scores, verify costs.

### Step 2: Run Yosemite Live (10 minutes)
```bash
npm run collect:yosemite:live
```
Verify in database with `npm run db:studio`.

### Step 3: Run All 10 Parks (1-2 hours)
```bash
npm run collect:top10:live
```
Sit back and let the AI agents do their work!

---

## 📚 Documentation

- [QUICK_START_AI_AGENTS.md](./QUICK_START_AI_AGENTS.md) - Quick start guide
- [AI_AGENTS_SETUP.md](./AI_AGENTS_SETUP.md) - Detailed setup
- [AI_AGENTS_SYSTEM.md](./AI_AGENTS_SYSTEM.md) - System architecture
- [TOP_10_PARKS_COLLECTION.md](./TOP_10_PARKS_COLLECTION.md) - Detailed guide for all 10 parks
- [NPS_API_INTEGRATION.md](./NPS_API_INTEGRATION.md) - Optional NPS API guide

---

## 🏔️ Let's Go!

Your command to start:

```bash
# Test first
npm run collect:yosemite

# Or go straight to all 10 parks (after testing one)
npm run collect:top10:live
```

**Estimated Results:**
- 10,000-15,000 high-quality trails
- $23-30 total cost
- 1-2 hours processing time
- All 10 most visited US National Parks covered

Happy trail collecting! 🚀
