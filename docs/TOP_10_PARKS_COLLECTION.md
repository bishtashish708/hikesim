# Top 10 National Parks Collection Guide

## 🎯 Overview

Collect trails from the 10 most visited US National Parks in one command.

**Expected Results:**
- 📊 10-15K trails total
- 💰 Cost: $20-40
- ⏱️ Time: 30-60 minutes
- ✅ Quality: 50-100/100 score

---

## 🏞️ Parks Included

| # | Park | Code | Visitors | Expected Trails |
|---|------|------|----------|-----------------|
| 1 | Great Smoky Mountains | grsm | 12.9M | 2,000-3,000 |
| 2 | Grand Canyon | grca | 4.7M | 1,000-1,500 |
| 3 | Zion | zion | 4.6M | 500-800 |
| 4 | Rocky Mountain | romo | 4.3M | 1,500-2,000 |
| 5 | Acadia | acad | 3.9M | 800-1,200 |
| 6 | Grand Teton | grte | 3.4M | 800-1,000 |
| 7 | Olympic | olym | 3.2M | 1,200-1,500 |
| 8 | Yellowstone | yell | 3.0M | 1,500-2,000 |
| 9 | Yosemite | yose | 3.0M | 800-1,200 |
| 10 | Glacier | glac | 2.9M | 1,000-1,500 |

**Total:** ~10,000-15,000 trails

---

## ⚡ Quick Start

### Step 1: Test with One Park (Recommended)

```bash
# Dry run (no database changes)
npm run collect:yosemite
```

This will:
- ✅ Show what data looks like
- ✅ Verify quality scores
- ✅ Estimate costs
- ❌ NOT write to database

### Step 2: Run Single Park Live

```bash
# Live run (inserts to database)
npm run collect:yosemite:live
```

Expected output:
```
✅ COLLECTION COMPLETE

📊 Final Results:
   - Collected: 98 trails
   - Validated: 87 trails
   - High Quality: 65 trails
   - Inserted: 62 trails
   - Skipped (duplicates): 3 trails

💰 Total Cost: ~$2.34
```

### Step 3: Run All 10 Parks

```bash
# Dry run all 10 parks
npm run collect:top10

# Live run all 10 parks
npm run collect:top10:live
```

---

## 🎮 Command Options

### Dry Run (Safe, Recommended First)

```bash
npm run collect:top10
```

Shows what would be inserted without modifying database.

### Live Run (Inserts to Database)

```bash
npm run collect:top10:live
```

Actually inserts trails to your PostgreSQL database.

### Specific Park Only

```bash
# By park code
npm run collect:top10:live -- --park=yose

# By partial name match
npm run collect:top10:live -- --park=glacier
```

---

## 📊 Expected Output

### Per-Park Output

```
████████████████████████████████████████████████████████████████████████████████
🏞️  PARK 1/10: Great Smoky Mountains National Park
📈 Annual Visitors: 12.9M
████████████████████████████████████████████████████████████████████████████████

================================================================================
🚀 Trail Collection Orchestrator
   Park: Great Smoky Mountains National Park
   Mode: LIVE (will insert to database)
   Min Quality Score: 50/100
================================================================================

📥 PHASE 1: DATA COLLECTION
────────────────────────────────────────────────────────────────────────────────
🔍 Querying OSM for trails in Great Smoky Mountains National Park...
✓ Found 350 trail elements from OSM

🧠 Using AI to parse 350 OSM elements...
  Processing batch 1/35...
    ✓ Extracted 8 trails (cost: $0.0012)
  Processing batch 2/35...
    ✓ Extracted 10 trails (cost: $0.0015)
  ...

💰 Total AI cost: $0.0456
✅ Collection complete! Found 245 trails in 67.3s


✅ PHASE 2: AI VALIDATION
────────────────────────────────────────────────────────────────────────────────
🧠 AI validating trails...

  [1/245] Validating: Alum Cave Trail
    Quality Score: 92/100 | Cost: $0.0019
    ✅ VALID - Added to database queue

  [2/245] Validating: Chimney Tops Trail
    Quality Score: 88/100 | Cost: $0.0021
    ✅ VALID - Added to database queue

  ...

✅ Validation complete in 312.5s
💰 Total AI cost: $4.2341
📊 Results:
   - Valid: 198
   - Invalid: 47
   - Duplicates: 0
   - Average quality score: 68.4/100

📊 Quality Filter: 156/198 trails meet quality threshold


💾 PHASE 3: DATABASE INSERTION
────────────────────────────────────────────────────────────────────────────────

Inserting 156 trails in batches of 50...

  Batch 1/4 (50 trails)...
    ✅ Inserted: Alum Cave Trail (quality: 92/100)
    ✅ Inserted: Chimney Tops Trail (quality: 88/100)
    ⏭️  Skipped (duplicate): Rainbow Falls Trail
    ...

✅ Batch insertion complete!
   - Inserted: 153
   - Skipped: 3
   - Failed: 0


================================================================================
✅ COLLECTION COMPLETE
================================================================================

📊 Final Results:
   - Collected: 245 trails
   - Validated: 198 trails
   - High Quality: 156 trails
   - Inserted: 153 trails
   - Skipped (duplicates): 3 trails
   - Failed: 0 trails

💰 Total Cost: Check individual agent outputs above
================================================================================

✅ Great Smoky Mountains National Park complete!
   Collected: 156 | Inserted: 153 | Skipped: 3

⏱️  Waiting 2 seconds before next park...

[Next park starts...]
```

### Final Summary (All Parks)

```
════════════════════════════════════════════════════════════════════════════════
🎉 COLLECTION COMPLETE - ALL 10 PARKS PROCESSED
════════════════════════════════════════════════════════════════════════════════

📊 Overall Summary:
   ✅ Successful parks: 10/10
   ❌ Failed parks: 0/10
   📥 Total trails collected: 12,847
   💾 Total trails inserted: 11,234
   ⏭️  Total trails skipped: 1,453
   ❌ Total trails failed: 160
   ⏱️  Total time: 47.3 minutes

📋 Breakdown by Park:

   1. Great Smoky Mountains National Park
      Collected: 2,456 | Inserted: 2,134 | Skipped: 312

   2. Grand Canyon National Park
      Collected: 1,234 | Inserted: 1,087 | Skipped: 132

   3. Zion National Park
      Collected: 678 | Inserted: 612 | Skipped: 58

   4. Rocky Mountain National Park
      Collected: 1,876 | Inserted: 1,645 | Skipped: 201

   5. Acadia National Park
      Collected: 987 | Inserted: 879 | Skipped: 98

   6. Grand Teton National Park
      Collected: 876 | Inserted: 765 | Skipped: 102

   7. Olympic National Park
      Collected: 1,345 | Inserted: 1,198 | Skipped: 132

   8. Yellowstone National Park
      Collected: 1,765 | Inserted: 1,543 | Skipped: 198

   9. Yosemite National Park
      Collected: 987 | Inserted: 867 | Skipped: 109

   10. Glacier National Park
       Collected: 1,123 | Inserted: 982 | Skipped: 128

════════════════════════════════════════════════════════════════════════════════
💡 Next Steps:
   1. Check your database: npm run db:studio
   2. Review data files in: data/raw/, data/validated/, data/results/
   3. Test your app to see the new trails!
════════════════════════════════════════════════════════════════════════════════
```

---

## 💰 Cost Breakdown

### Per-Trail Costs
- Collection Agent (GPT-4o Mini): $0.0004
- Validation Agent (Claude Sonnet 4.5): $0.0015
- **Total per trail:** $0.0019

### Per-Park Estimates (avg 1,200 trails)
- Collection: ~$0.50
- Validation: ~$1.80
- **Total per park:** ~$2.30

### All 10 Parks (12-15K trails)
- Collection: ~$5-7
- Validation: ~$18-22
- **Total estimated:** $23-30

**Actual cost may vary based on:**
- Number of trails found by OSM
- Complexity of trail data
- OpenRouter model pricing changes

---

## ⏱️ Time Estimates

### Per Park
- Collection: 1-3 minutes
- Validation: 3-8 minutes
- Insertion: 30 seconds - 2 minutes
- **Total:** 5-13 minutes per park

### All 10 Parks
- **Sequential processing:** 50-130 minutes (0.8-2.2 hours)
- Includes 2-second delays between parks for API rate limiting

---

## 🛡️ Safety Features

### Duplicate Detection
- Checks database before inserting each trail
- Matches by: name + parkName
- Skips duplicates automatically

### Quality Filtering
- Default threshold: 50/100
- Only high-quality trails inserted
- Low-quality trails logged but not inserted

### Dry Run Mode
- Always test with dry run first
- Preview data before inserting
- Verify quality scores

### Rate Limiting
- 2-second delay between parks
- Batch processing (50 trails at a time)
- Respects OSM API fair use

---

## 🔍 Verify Results

### Check Database

```bash
npm run db:studio
```

Then filter by:
- `lastEnriched` = today's date
- `sourceUrl` contains "openstreetmap.org"
- `isSeed` = false

### Review Data Files

All data saved to:
```
data/
├── raw/                     # Raw collected trails (per park)
├── validated/               # Validated trails with scores
└── results/                 # Database insertion results
```

Files named with timestamp:
- `grsm-1234567890.json`
- `grsm-validated-1234567890.json`
- `insert-result-1234567890.json`

---

## ❓ Troubleshooting

### No Trails Found

**Problem:** Park returns 0 trails

**Solution:**
- Check OSM has trails for that park (usually does)
- Verify bounding box in `src/agents/collector/osm-client.ts`
- Try smaller test area first

### High Costs

**Problem:** Cost exceeds estimate

**Solution:**
- Lower `minQualityScore` to 40 (processes fewer trails)
- Use dry run first to estimate
- Process one park at a time

### Slow Performance

**Problem:** Takes too long

**Solution:**
- Process parks individually instead of all 10
- Use faster model for validation (not recommended, lower quality)
- Increase batch size to 100

### API Errors

**Problem:** OSM Overpass API timeout

**Solution:**
- Wait a few minutes and retry
- Process during off-peak hours
- Reduce query complexity (fewer trail types)

---

## 🎯 Best Practices

1. **Always dry run first**
   ```bash
   npm run collect:top10  # Preview results
   ```

2. **Start with one park**
   ```bash
   npm run collect:yosemite:live  # Test with Yosemite
   ```

3. **Monitor costs**
   - Check OpenRouter dashboard during run
   - Each park shows cost in output

4. **Review quality scores**
   - Trails with score < 60 may have missing data
   - Adjust `minQualityScore` threshold as needed

5. **Backup database before large imports**
   ```bash
   npm run db:backup
   ```

6. **Check for duplicates after import**
   ```sql
   SELECT name, parkName, COUNT(*)
   FROM "Hike"
   GROUP BY name, parkName
   HAVING COUNT(*) > 1;
   ```

---

## 📚 Related Docs

- [QUICK_START_AI_AGENTS.md](./QUICK_START_AI_AGENTS.md) - Quick start guide
- [AI_AGENTS_SETUP.md](./AI_AGENTS_SETUP.md) - Detailed setup
- [AI_AGENTS_SYSTEM.md](./AI_AGENTS_SYSTEM.md) - System architecture
- [NPS_API_INTEGRATION.md](./NPS_API_INTEGRATION.md) - Optional NPS API

---

## 🚀 Ready to Go!

You're all set to collect trails from the top 10 national parks!

```bash
# Test first
npm run collect:top10

# Then go live
npm run collect:top10:live
```

Happy trail collecting! 🏔️
