# NPS API Integration Guide

## 📋 Overview

The National Park Service (NPS) API can provide additional trail metadata to enrich the data collected from OpenStreetMap.

**Benefits of NPS API:**
- Official park information
- Trail descriptions and features
- Seasonal closures and alerts
- Park contact information
- Images and multimedia

---

## 🔑 Setup NPS API Key

### Step 1: Get Your NPS API Key

1. Visit: [https://www.nps.gov/subjects/developer/get-started.htm](https://www.nps.gov/subjects/developer/get-started.htm)
2. Fill out the API key request form
3. You'll receive an API key via email (usually instant)
4. **It's FREE with no cost!**

### Step 2: Add to Environment

Open your `.env` file and add:

```bash
NPS_API_KEY="your-nps-api-key-here"
```

---

## 🚀 Current Status

**Status:** NPS API integration is OPTIONAL and not yet implemented in the agents.

The current system uses:
- ✅ OpenStreetMap (OSM) for trail data
- ✅ AI agents for parsing and validation
- ⏳ NPS API (ready to integrate when needed)

---

## 💡 When to Use NPS API

### Use NPS API when you want:
1. **Official park descriptions** - Get official NPS trail descriptions
2. **Park alerts** - Current closures, hazards, weather warnings
3. **Multimedia** - Official NPS trail photos and videos
4. **Contact info** - Park ranger stations, visitor centers
5. **Seasonal data** - Best times to visit, snow conditions

### OSM is better for:
1. **GPS coordinates** - Detailed trail paths and waypoints
2. **Trail geometry** - Exact routes with all coordinates
3. **Surface/difficulty** - Crowdsourced trail conditions
4. **Coverage** - More comprehensive trail data

---

## 🔧 How to Integrate (Future Enhancement)

When ready to add NPS data enrichment, create `/src/agents/enricher/nps-client.ts`:

```typescript
export class NPSClient {
  private apiKey: string;
  private baseUrl = 'https://developer.nps.gov/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTrailsForPark(parkCode: string) {
    const response = await fetch(
      `${this.baseUrl}/thingstodo?parkCode=${parkCode}&api_key=${this.apiKey}`
    );
    return await response.json();
  }

  async getParkInfo(parkCode: string) {
    const response = await fetch(
      `${this.baseUrl}/parks?parkCode=${parkCode}&api_key=${this.apiKey}`
    );
    return await response.json();
  }

  async getAlerts(parkCode: string) {
    const response = await fetch(
      `${this.baseUrl}/alerts?parkCode=${parkCode}&api_key=${this.apiKey}`
    );
    return await response.json();
  }
}
```

Then integrate in the orchestrator after OSM collection:

```typescript
// After OSM collection
const osmTrails = await this.collectionAgent.collectTrailsForPark(parkName, parkCode);

// Enrich with NPS data
const npsClient = new NPSClient(process.env.NPS_API_KEY!);
const npsData = await npsClient.getTrailsForPark(parkCode);

// Merge OSM + NPS data with AI
const enrichedTrails = await this.enrichmentAgent.mergeData(osmTrails, npsData);
```

---

## 📊 Cost Comparison

| Source | Cost | Data Quality | Coverage |
|--------|------|--------------|----------|
| OSM | FREE | Good (crowdsourced) | Excellent (global) |
| NPS API | FREE | Excellent (official) | Limited (US parks only) |
| OpenRouter AI | ~$0.002/trail | N/A (processing) | N/A |

**Recommendation:** Use OSM + AI for now, add NPS later for enrichment.

---

## 🎯 Immediate Next Steps

For now, you can:

1. **Skip NPS integration** - OSM + AI provides excellent results
2. **Run the collection** - Start with `npm run collect:top10`
3. **Add NPS later** - Integrate NPS API as a Phase 2 enhancement

The current system is ready to collect 10-15K trails without NPS API!

---

## 📚 NPS API Documentation

- **Developer Portal:** [https://www.nps.gov/subjects/developer/](https://www.nps.gov/subjects/developer/)
- **API Reference:** [https://www.nps.gov/subjects/developer/api-documentation.htm](https://www.nps.gov/subjects/developer/api-documentation.htm)
- **Rate Limits:** 1,000 requests/hour (very generous)
- **Cost:** FREE

---

## ✅ Summary

**Current Setup:**
- ✅ OpenRouter API key (required) - Added
- ⏳ NPS API key (optional) - Add to `.env` when ready

**What Works Now:**
- Full trail collection from OSM
- AI-powered validation and enrichment
- Database insertion with quality scoring

**What's Missing:**
- NPS API enrichment (optional future enhancement)

**You're ready to collect trails!** 🏔️

```bash
# Test with one park first
npm run collect:yosemite

# Then collect all top 10 parks
npm run collect:top10:live
```
