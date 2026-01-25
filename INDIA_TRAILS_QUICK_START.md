# 🇮🇳 Quick Start: Collecting Indian Himalayan Trails

**TL;DR:** How to collect official, high-quality hiking trails from Uttarakhand & Himachal Pradesh

---

## 🎯 Best Approach

**Use OpenStreetMap (OSM)** with the same system that collected 1,103 US trails.

### Why OSM?
- ✅ Free and open-source
- ✅ Good coverage in popular trekking areas
- ✅ Same proven system (99.3% success rate)
- ✅ Expected: 330-650 trails

---

## ⚡ Quick Implementation (3 Steps)

### Step 1: Define Indian Regions

```typescript
// Add to scripts/collect-india-trails.ts
const INDIAN_REGIONS = [
  // Uttarakhand - Popular Areas
  { name: 'Valley of Flowers', state: 'Uttarakhand',
    bbox: [30.6, 79.4, 30.8, 79.7] },
  { name: 'Kedarnath Valley', state: 'Uttarakhand',
    bbox: [30.5, 79.0, 31.0, 79.5] },
  { name: 'Garhwal Himalayas', state: 'Uttarakhand',
    bbox: [29.5, 78.5, 31.5, 80.5] },

  // Himachal Pradesh - Popular Areas
  { name: 'Kullu-Manali', state: 'Himachal Pradesh',
    bbox: [31.5, 77.0, 32.5, 77.5] },
  { name: 'Dharamshala-Triund', state: 'Himachal Pradesh',
    bbox: [31.8, 76.0, 32.5, 76.8] },
  { name: 'Spiti Valley', state: 'Himachal Pradesh',
    bbox: [31.5, 77.5, 32.5, 78.5] },
];
```

### Step 2: Update Database Schema

```prisma
// Add to prisma/schema.prisma
model Hike {
  // ... existing fields ...

  state         String?   // "Uttarakhand" or "Himachal Pradesh"
  region        String?   // "Kullu-Manali", "Valley of Flowers", etc.
  isRestricted  Boolean   @default(false)  // Requires permit?
  permitInfo    String?   // Where to get permits
  bestSeason    String?   // "May-Oct", "Jun-Sep", etc.
}
```

```bash
npm run db:push
```

### Step 3: Run Collection

```bash
# Test with Valley of Flowers first
npm run collect:india -- --region="Valley of Flowers"

# After verification, run all regions
npm run collect:india:live
```

---

## 🏔️ Priority Trails to Verify

### Uttarakhand (Must Have)
1. **Valley of Flowers** - UNESCO site, most famous
2. **Roopkund Lake** - Skeleton lake, very popular
3. **Kedarnath Trek** - Major pilgrimage
4. **Chopta-Tungnath-Chandrashila** - Highest Shiva temple
5. **Har Ki Dun** - Beautiful valley

### Himachal Pradesh (Must Have)
1. **Triund Trek** - Most popular day hike
2. **Hampta Pass** - Classic Himachal trek
3. **Beas Kund** - Source of Beas River
4. **Bhrigu Lake** - Sacred high-altitude lake
5. **Prashar Lake** - Sacred lake with floating island

---

## 📊 Expected Results

**Best Case (OSM has good data):**
- 330-650 trails across both states
- Quality: Medium to High
- Cost: $15-25

**Coverage by Region:**
- ✅ **Excellent:** Kullu-Manali, Dharamshala, Valley of Flowers
- ⚠️ **Medium:** Kedarnath, Badrinath, Garhwal areas
- ❌ **Limited:** Remote passes, restricted areas

---

## 🚧 If OSM Data is Insufficient

### Option A: Government Websites (Manual)
1. Visit https://uttarakhandtourism.gov.in
2. Visit https://himachaltourism.gov.in
3. Manually extract trail names and locations
4. Add to database with `isOfficial: true` flag

### Option B: Partner with Trekking Companies
Contact:
- **Indiahikes** (largest) - https://indiahikes.com
- **Trek The Himalayas** - https://trekthehimalayas.com
- **YHAI** - Youth Hostels Association of India

Request data sharing agreement.

### Option C: Crowdsource
- Create submission form on your website
- Let trekkers add trails they've done
- Manually validate submissions

---

## 💡 Pro Tips

1. **Start Small:** Test with one popular region (Valley of Flowers or Triund)
2. **Verify Quality:** Cross-check OSM data with Indiahikes trail names
3. **Add Value:** Include permit info, best season, difficulty ratings
4. **Be Patient:** Remote Himalayan areas have limited digital coverage

---

## 🎯 Sample OSM Query for Uttarakhand

```javascript
const query = `
[out:json][timeout:180];
(
  // Hiking paths with names
  way["highway"~"path|footway|track"]["name"]["foot"!="no"](28.5,77.5,31.5,81.0);

  // Hiking routes
  relation["route"="hiking"]["name"](28.5,77.5,31.5,81.0);

  // Popular trekking areas
  way["leisure"="nature_reserve"]["name"](28.5,77.5,31.5,81.0);
);
out body;
>;
out skel qt;
`;
```

**Bounding Box:**
- Uttarakhand: `(28.5, 77.5, 31.5, 81.0)`
- Himachal Pradesh: `(30.0, 75.5, 33.5, 79.5)`

---

## 📞 Useful Contacts

**Official Bodies:**
- Indian Mountaineering Foundation: https://indmount.org
- Uttarakhand Tourism: tourism.uk.gov.in
- Himachal Tourism: himachaltourism.gov.in

**Trekking Communities:**
- r/IndiaHiking (Reddit)
- BHPian Forums
- Indiamike.com

---

## ✅ Quick Checklist

Before you start:
- [ ] OpenRouter API key set in `.env`
- [ ] Database schema updated with Indian fields
- [ ] Test OSM query returns data for Valley of Flowers
- [ ] Budget allocated ($15-25 estimated)

After collection:
- [ ] Verify trail counts match expectations
- [ ] Cross-check popular trail names with Indiahikes
- [ ] Add permit information manually
- [ ] Test trail display in your app

---

## 🎉 Expected Outcome

**After successful collection:**
- 330-650 Indian Himalayan trails
- Best coverage: Kullu-Manali, Dharamshala, Rishikesh areas
- Quality: 70-90/100 (lower than US due to limited OSM data)
- Ready for production!

---

**Full Guide:** See [docs/INDIA_TRAIL_COLLECTION.md](./docs/INDIA_TRAIL_COLLECTION.md)

**Questions?** Check the comprehensive guide or reach out to Indian trekking communities.

---

Last Updated: January 25, 2026
