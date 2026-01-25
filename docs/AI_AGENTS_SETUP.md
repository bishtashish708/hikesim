# AI Agents Setup Guide

This guide will help you set up and run the AI-powered trail collection agents for Yosemite National Park.

## 🎯 What This Does

The multi-agent system:

1. **Collection Agent** (GPT-4o Mini) - Fetches trail data from OpenStreetMap
2. **Validation Agent** (Claude Sonnet 4.5) - Validates quality, enriches data, scores trails
3. **Orchestrator** - Coordinates both agents and inserts validated trails to database

## 💰 Expected Cost

For Yosemite National Park (~100-200 trails):
- Collection: ~$0.40
- Validation: ~$1.50-3.00
- **Total: ~$2-4**

## 📋 Prerequisites

### 1. OpenRouter Account

1. Go to [https://openrouter.ai/](https://openrouter.ai/)
2. Sign up for an account
3. Add credits (minimum $5 recommended)
4. Get your API key from [https://openrouter.ai/keys](https://openrouter.ai/keys)

### 2. Environment Setup

Add your OpenRouter API key to `.env.local`:

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

Or export as environment variable:

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxx"
```

### 3. Install Dependencies

The required dependencies should already be installed. If not:

```bash
npm install
```

## 🚀 Running the Agents

### Dry Run (Recommended First)

Test the system without writing to the database:

```bash
npx tsx scripts/collect-yosemite.ts
```

This will:
- ✅ Fetch trails from OpenStreetMap
- ✅ Validate with AI
- ✅ Show what would be inserted
- ❌ NOT write to database

### Live Run (Inserts to Database)

After verifying the dry run looks good:

```bash
npx tsx scripts/collect-yosemite.ts --live
```

This will:
- ✅ Fetch trails from OpenStreetMap
- ✅ Validate with AI
- ✅ Insert validated trails to database
- ⚠️  **Actually modifies your database**

## 📊 What to Expect

### Console Output

You'll see detailed progress:

```
🚀 Trail Collection Orchestrator
   Park: Yosemite National Park
   Mode: DRY RUN (no database writes)
   Min Quality Score: 50/100
================================================================================

📥 PHASE 1: DATA COLLECTION
────────────────────────────────────────────────────────────────────────────────
🔍 Querying OSM for trails in Yosemite National Park...
✓ Found 150 trail elements from OSM

🧠 Using AI to parse 150 OSM elements...
  Processing batch 1/15...
    ✓ Extracted 8 trails (cost: $0.0012)
  Processing batch 2/15...
    ✓ Extracted 10 trails (cost: $0.0015)
  ...

💰 Total AI cost: $0.0234
✅ Collection complete! Found 98 trails in 45.2s

✅ PHASE 2: AI VALIDATION
────────────────────────────────────────────────────────────────────────────────
🧠 AI validating trails...

  [1/98] Validating: Half Dome Trail
    Quality Score: 95/100 | Cost: $0.0023
    ✅ VALID - Added to database queue

  [2/98] Validating: Mist Trail
    Quality Score: 88/100 | Cost: $0.0019
    ✅ VALID - Added to database queue

  ...

✅ Validation complete in 180.5s
💰 Total AI cost: $2.1450
📊 Results:
   - Valid: 87
   - Invalid: 11
   - Duplicates: 0
   - Average quality score: 72.3/100

📊 Quality Filter: 65/87 trails meet quality threshold

💾 PHASE 3: DATABASE INSERTION
────────────────────────────────────────────────────────────────────────────────
🔍 DRY RUN - Would insert 65 trails

Sample trails that would be inserted:
  1. Half Dome Trail (8.5 mi, 4800 ft, quality: 95/100)
  2. Mist Trail (5.4 mi, 1000 ft, quality: 88/100)
  3. Vernal Fall Trail (5.4 mi, 1000 ft, quality: 85/100)
  4. Nevada Fall Trail (7.0 mi, 1900 ft, quality: 82/100)
  5. Clouds Rest Trail (14.5 mi, 2300 ft, quality: 80/100)
```

### Generated Files

All data is saved to `data/` directory:

```
data/
├── raw/
│   └── yosemite-1234567890.json       # Raw collected trails
├── validated/
│   └── yosemite-validated-1234567890.json  # Validated trails with scores
└── results/
    └── insert-result-1234567890.json  # Database insertion results
```

## 🔍 Quality Scoring

The AI validation agent scores trails 0-100 based on:

- **Name** (15 points) - Has a real name, not "Unnamed Trail"
- **Distance** (15 points) - Has distance in miles
- **Elevation** (15 points) - Has elevation gain
- **GPS Path** (20 points) - Has full coordinate path
- **Difficulty** (10 points) - Has difficulty rating
- **Description** (10 points) - Has trail description
- **Trail Type** (5 points) - Loop, Out & Back, etc.
- **Surface** (5 points) - Dirt, Gravel, Rocky, etc.
- **Rich GPS** (+5 bonus) - Has 50+ coordinate points

Trails with score < 50 are rejected by default.

## 🛠️ Customization

### Adjust Quality Threshold

In `scripts/collect-yosemite.ts`, change:

```typescript
minQualityScore: 50, // Lower = more trails, higher = better quality
```

### Adjust Batch Size

```typescript
batchSize: 50, // Number of trails per database batch
```

### Change AI Models

In the agent files:

**Collection Agent** (`src/agents/collector/agent.ts`):
```typescript
private model = 'openai/gpt-4o-mini'; // Fast and cheap
```

**Validation Agent** (`src/agents/validator/agent.ts`):
```typescript
private model = 'anthropic/claude-sonnet-4-5'; // Better reasoning
```

Available models:
- `openai/gpt-4o-mini` - Cheapest, fast ($0.15/$0.60 per 1M tokens)
- `openai/gpt-4o` - Better quality, more expensive
- `anthropic/claude-sonnet-4-5` - Best reasoning ($3/$15 per 1M tokens)

## 📈 Next Steps

After Yosemite succeeds, you can:

1. **Add more parks** - Copy the script and change park name/code
2. **Batch processing** - Process all major national parks
3. **Add NPS API** - Fetch additional metadata from National Park Service
4. **Add elevation data** - Integrate USGS Elevation API for accurate profiles
5. **Schedule regular updates** - Run as cron job to keep trails fresh

## 🐛 Troubleshooting

### "OPENROUTER_API_KEY not set"

Make sure you've added the key to `.env.local` or exported it:

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxx"
```

### "Insufficient credits"

Add more credits at [https://openrouter.ai/credits](https://openrouter.ai/credits)

### "No trails found"

- Check that OSM has trails for the park (they should)
- Check the bounding box in `src/agents/collector/osm-client.ts`
- Try a smaller test area first

### High costs

- Lower `minQualityScore` to process fewer trails
- Use `gpt-4o-mini` for both agents (less accurate validation)
- Process in smaller batches

## 📚 File Structure

```
src/agents/
├── base/
│   ├── types.ts              # TypeScript types
│   ├── utils.ts              # Helper functions
│   └── openrouter-client.ts  # OpenRouter API client
├── collector/
│   ├── agent.ts              # AI collection agent
│   └── osm-client.ts         # OpenStreetMap API client
├── validator/
│   └── agent.ts              # AI validation agent
└── orchestrator.ts           # Main coordinator

scripts/
└── collect-yosemite.ts       # CLI script to run

data/
├── raw/                      # Raw collected data
├── validated/                # Validated data with scores
└── results/                  # Database insertion results
```

## 💡 Tips

1. **Always dry run first** - Verify the data looks good before inserting
2. **Monitor costs** - Check OpenRouter dashboard during runs
3. **Review quality scores** - Trails with score < 60 may have missing data
4. **Check duplicates** - The system skips existing trails by name+park
5. **Save output** - All results are saved to `data/` for review

## 🎉 Success Criteria

After a successful run, you should see:
- ✅ 50-100+ trails collected for Yosemite
- ✅ ~70%+ validation pass rate
- ✅ Average quality score 70+/100
- ✅ Trails inserted to database with GPS, elevation, difficulty
- ✅ Total cost under $5

Good luck! 🚀
