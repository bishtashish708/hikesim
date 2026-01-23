# Step 2: Trail Data Enrichment Pipeline

## 🎯 Objectives

1. **Integrate OpenStreetMap (OSM)** - Fetch real hiking trails from US & India
2. **Add OpenTopoData** - Enrich trails with accurate elevation profiles
3. **Enhance existing data** - Add missing metadata (difficulty, location details, coordinates)
4. **Enable trail discovery** - Search and filter trails by region
5. **Quality assurance** - Validate and verify trail data accuracy

---

## 📊 Current State Analysis

### Existing Data Structure ✅
```typescript
{
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  profilePoints: Array<{
    distanceMiles: number;
    elevationFt: number;
  }>;
  countryCode: string;  // "US" or "IN"
  stateCode: string;    // e.g., "CA", "CO"
  isSeed: boolean;
  createdAt: Date;
}
```

### What's Missing
- ❌ GPS coordinates (lat/lon for trailhead)
- ❌ Trail difficulty rating
- ❌ Route geometry (GPS path)
- ❌ Location details (city, park name)
- ❌ Trail type (loop, out-and-back, point-to-point)
- ❌ Surface type (paved, dirt, rocky)
- ❌ Source attribution

---

## 🏗️ Architecture Design

### Data Flow
```
1. OSM Query → Fetch trails by region
2. Extract metadata → Parse trail properties
3. OpenTopoData → Get elevation profile from GPS path
4. Validate → Check data quality
5. Store → Save to PostgreSQL
6. Index → Enable fast search/filter
```

### Components

#### 1. **OSM Trail Fetcher**
- Query Overpass API for hiking trails
- Filter by region (US states, India regions)
- Extract: name, coordinates, distance, tags

#### 2. **Elevation Profile Generator**
- Take GPS coordinates from OSM
- Query OpenTopoData API
- Generate elevation profile points
- Calculate total elevation gain

#### 3. **Trail Enrichment Service**
- Combine OSM + OpenTopoData
- Add metadata (difficulty, type, surface)
- Geocode location (city, state, country)
- Validate data completeness

#### 4. **Database Schema Updates**
```prisma
model Hike {
  // Existing fields...

  // NEW FIELDS:
  latitude          Float?    // Trailhead coordinates
  longitude         Float?
  coordinates       Json?     // Full GPS path [[lat, lon], ...]
  difficulty        String?   // Easy, Moderate, Hard, Very Hard
  trailType         String?   // Loop, Out & Back, Point to Point
  surface           String?   // Paved, Gravel, Dirt, Rocky
  city              String?   // Nearest city
  parkName          String?   // National/State Park name
  region            String?   // For India: Himalayas, Western Ghats, etc.
  sourceUrl         String?   // OSM way/relation ID
  lastEnriched      DateTime? // When data was last updated
}
```

---

## 🛠️ Implementation Plan

### Phase 1: Setup & Infrastructure (30 min)
- [ ] Update Prisma schema with new fields
- [ ] Create migration
- [ ] Install dependencies (axios for API calls)
- [ ] Set up API rate limiting

### Phase 2: OSM Integration (1-2 hours)
- [ ] Create OSM Overpass query builder
- [ ] Implement trail fetcher for US regions
  - Priority: California, Colorado, Washington, Utah, Arizona
- [ ] Implement trail fetcher for India regions
  - Priority: Himachal Pradesh, Uttarakhand, Kashmir
- [ ] Parse OSM response into our format
- [ ] Handle pagination and rate limits

### Phase 3: OpenTopoData Integration (1-2 hours)
- [ ] Create elevation profile generator
- [ ] Query OpenTopoData with GPS coordinates
- [ ] Generate elevation points (every 0.1 miles)
- [ ] Calculate total elevation gain/loss
- [ ] Cache results to avoid re-querying

### Phase 4: Trail Enrichment (1-2 hours)
- [ ] Difficulty calculator (based on distance + elevation)
- [ ] Location geocoder (city, park name)
- [ ] Data validator (ensure completeness)
- [ ] Batch enrichment script for existing hikes

### Phase 5: Search & Discovery (1 hour)
- [ ] Add database indexes for fast search
- [ ] Create API endpoints:
  - `/api/trails/search?q=term`
  - `/api/trails/by-region?country=US&state=CA`
  - `/api/trails/by-difficulty?level=moderate`
- [ ] Update HikesList component with filters

---

## 🌐 API Integration Details

### OpenStreetMap Overpass API
**Endpoint:** `https://overpass-api.de/api/interpreter`

**Sample Query (California hiking trails):**
```overpass
[out:json][timeout:25];
area["ISO3166-1"="US"]["name"="California"]->.a;
(
  way["highway"="path"]["sac_scale"](area.a);
  way["highway"="track"]["sac_scale"](area.a);
  relation["route"="hiking"](area.a);
);
out geom;
```

**Rate Limits:**
- Free tier: ~1000 requests/day
- Response time: 1-5 seconds
- **Strategy:** Cache results, batch queries

**Data Extracted:**
- `name`: Trail name
- `tags.sac_scale`: Difficulty (hiking, mountain_hiking, demanding_mountain_hiking)
- `geometry`: GPS coordinates
- `tags.distance`: Sometimes available
- `tags.surface`: Trail surface type

### OpenTopoData API
**Endpoint:** `https://api.opentopodata.org/v1/srtm30m`

**Sample Request:**
```
GET https://api.opentopodata.org/v1/srtm30m?locations=39.7392,-104.9903|39.7400,-104.9910
```

**Rate Limits:**
- Free tier: 100 requests/day, 1 request/second
- Max 100 locations per request
- **Strategy:** Self-host for production (Docker available)

**Data Returned:**
```json
{
  "results": [
    {
      "elevation": 1655.2,
      "location": { "lat": 39.7392, "lng": -104.9903 }
    }
  ]
}
```

---

## 💰 Cost Analysis

### Free Tier Capabilities
| Service | Free Limit | Cost After |
|---------|-----------|------------|
| **OSM Overpass** | ~1000 req/day | Free (open data) |
| **OpenTopoData** | 100 req/day | Self-host (free) |
| **PostgreSQL (Neon)** | 0.5GB storage | $0 (within limit) |

### Recommended Approach
1. **Development:** Use free APIs
2. **Production:** Self-host OpenTopoData (Docker)
   - `docker run -p 5000:5000 ghcr.io/ajnisbet/opentopodata:latest`
   - Cost: $0 (uses your server)

---

## 📋 Priority Trail Regions

### United States (Top 10 Hiking States)
1. **California** - 50 trails
   - Yosemite, Sequoia, Sierra Nevada
2. **Colorado** - 40 trails
   - Rocky Mountains, 14ers
3. **Washington** - 30 trails
   - Cascades, Olympics, Rainier
4. **Utah** - 25 trails
   - Zion, Arches, Canyonlands
5. **Arizona** - 20 trails
   - Grand Canyon, Sedona
6. **Wyoming** - 15 trails
   - Yellowstone, Grand Tetons
7. **Montana** - 15 trails
   - Glacier National Park
8. **Oregon** - 15 trails
   - Columbia Gorge, Crater Lake
9. **New Mexico** - 10 trails
   - Sangre de Cristo
10. **Alaska** - 10 trails
    - Denali, Kenai Fjords

**Total US Trails:** ~230

### India (Top 5 Hiking Regions)
1. **Himachal Pradesh** - 30 trails
   - Manali, Spiti, Dharamshala
2. **Uttarakhand** - 30 trails
   - Valley of Flowers, Kedarnath, Nanda Devi
3. **Jammu & Kashmir** - 20 trails
   - Ladakh, Kashmir Valley
4. **Sikkim** - 15 trails
   - Kanchenjunga, Goecha La
5. **Maharashtra** - 15 trails
   - Western Ghats, Sahyadri

**Total India Trails:** ~110

**Grand Total:** ~340 trails (start with top 100-150)

---

## 🎯 Success Criteria

- [ ] Schema updated with new fields
- [ ] 50+ US trails imported from OSM
- [ ] 30+ India trails imported from OSM
- [ ] All trails have elevation profiles
- [ ] Difficulty ratings calculated
- [ ] Location data complete (city, state, park)
- [ ] Search and filtering working
- [ ] Existing 64 hikes enriched with missing data
- [ ] API rate limits respected
- [ ] Data quality >95% (validated fields)

---

## 🚀 Quick Start Commands

```bash
# Update schema
npm run db:migrate

# Fetch trails from OSM
npm run trails:fetch-osm -- --region CA --limit 50

# Enrich with elevation data
npm run trails:enrich -- --all

# Validate data quality
npm run trails:validate

# Import to database
npm run trails:import
```

---

## 📝 Next Steps

After Step 2 completion:
- ✅ Trail database with 100+ quality hikes
- ✅ Search and filtering by region/difficulty
- ✅ Accurate elevation profiles
- → **Ready for Step 3:** AI integration with rich trail data

---

**Estimated Time:** 4-6 hours
**Dependencies:** axios (API calls), dotenv (config)
**APIs Used:** OSM Overpass (free), OpenTopoData (free tier)
