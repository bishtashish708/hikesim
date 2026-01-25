# 🎯 Phase 2 Implementation Plan - UI Cleanup & Treadmill Simulation

**Generated:** January 25, 2026
**Status:** Planning Phase
**Priority:** High

---

## 📋 Overview

Three major initiatives to enhance HikeSim:

1. **🗺️ UI Cleanup** - Change country/state to show National Parks
2. **🧹 Remove Trending Logic** - Simplify to show all trails
3. **🏃 Treadmill Simulation** - Long-term smartwatch integration project

---

# TASK 1: UI Cleanup - National Parks Focus

## 🎯 Goal
Change UI from "Country → States" to "Country: US Only → National Parks" since we only have US data currently.

## 📊 Current State Analysis

**Components Using Country/State:**
- `TrendingHikesPanel.tsx` - Country/State dropdowns with localStorage
- `HikesList.tsx` - Country/State filters via URL params
- `CustomHikeForm.tsx` - Country/State selection for custom hikes

**API Endpoints:**
- `/api/geo/countries` - Returns all countries
- `/api/geo/states` - Returns states by country
- `/api/hikes/list` - Filters by country/state
- `/api/hikes/trending` - Filters by country/state

**Database Fields:**
- `Hike.countryCode` - Currently "US" for all trails
- `Hike.stateCode` - US state codes (CA, AZ, UT, etc.)
- `Hike.parkName` - National Park names ✅ (This is what we want to use!)

## ✅ Implementation Steps

### Step 1.1: Create National Parks API Endpoint
**File:** `src/app/api/geo/parks/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all unique park names from our database
    const parks = await prisma.hike.findMany({
      where: {
        parkName: { not: null },
        countryCode: 'US',
      },
      select: {
        parkName: true,
      },
      distinct: ['parkName'],
      orderBy: {
        parkName: 'asc',
      },
    });

    // Format for UI dropdowns
    const parkList = parks
      .map(p => p.parkName)
      .filter(Boolean)
      .sort();

    return NextResponse.json({
      parks: parkList,
      count: parkList.length
    });
  } catch (error) {
    console.error('Error fetching parks:', error);
    return NextResponse.json({ error: 'Failed to fetch parks' }, { status: 500 });
  }
}
```

### Step 1.2: Update HikesList Component
**File:** `src/components/HikesList.tsx`

**Changes:**
1. Remove country dropdown (hardcode to "US")
2. Replace state dropdown with park dropdown
3. Update URL params from `?country=US&state=CA` to `?park=Yosemite National Park`
4. Update API call to use park filter

**Before:**
```typescript
const searchParams = useSearchParams();
const country = searchParams.get('country');
const state = searchParams.get('state');
// Fetch countries and states...
```

**After:**
```typescript
const searchParams = useSearchParams();
const park = searchParams.get('park');
// Fetch parks only...
```

### Step 1.3: Update TrendingHikesPanel Component
**File:** `src/components/TrendingHikesPanel.tsx`

**Changes:**
1. Remove country/state selectors
2. Add single "National Park" dropdown
3. Update localStorage keys from `hikes:country`, `hikes:states` to `hikes:park`
4. Remove "Use my location" button (not needed for parks)
5. Update API call to `/api/hikes/by-park` (new endpoint)

**UI Changes:**
```tsx
// Before: Two dropdowns (Country, State)
<select value={country}>...</select>
<select value={state}>...</select>

// After: One dropdown (National Park)
<select value={park} onChange={handleParkChange}>
  <option value="">All National Parks</option>
  {parks.map(park => (
    <option key={park} value={park}>{park}</option>
  ))}
</select>
```

### Step 1.4: Create New API Endpoint for Park Filtering
**File:** `src/app/api/hikes/by-park/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const park = searchParams.get('park');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      countryCode: 'US',
    };

    if (park) {
      where.parkName = park;
    }

    const [items, total] = await Promise.all([
      prisma.hike.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { parkName: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          distanceMiles: true,
          elevationGainFt: true,
          difficulty: true,
          trailType: true,
          parkName: true,
          stateCode: true,
        },
      }),
      prisma.hike.count({ where }),
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
      parkName: park || 'All Parks',
    });
  } catch (error) {
    console.error('Error fetching hikes by park:', error);
    return NextResponse.json({ error: 'Failed to fetch hikes' }, { status: 500 });
  }
}
```

### Step 1.5: Update CustomHikeForm
**File:** `src/components/CustomHikeForm.tsx`

**Changes:**
1. Hardcode country to "US"
2. Replace state dropdown with park dropdown
3. Add "Other" option for trails outside National Parks

### Step 1.6: Update API Search/Filter Endpoints
**Files to Update:**
- `src/app/api/hikes/list/route.ts` - Add park filter
- `src/app/api/trails/search/route.ts` - Support park in search
- `src/app/api/trails/by-region/route.ts` - Group by park instead of state

**Example for `/api/hikes/list`:**
```typescript
// Add park parameter
const park = searchParams.get('park');

// Update where clause
if (park) {
  where.parkName = park;
}
```

### Step 1.7: Update Hikes Page Header
**File:** `src/app/hikes/page.tsx`

**Before:**
```tsx
<p className="text-base-content/70">
  Explore trails across the United States
</p>
```

**After:**
```tsx
<p className="text-base-content/70">
  Explore 1,102 trails across 10 US National Parks
</p>
```

## 📝 Summary - Task 1

**Files to Create:**
- `src/app/api/geo/parks/route.ts`
- `src/app/api/hikes/by-park/route.ts`

**Files to Modify:**
- `src/components/HikesList.tsx`
- `src/components/TrendingHikesPanel.tsx`
- `src/components/CustomHikeForm.tsx`
- `src/app/api/hikes/list/route.ts`
- `src/app/api/trails/search/route.ts`
- `src/app/api/trails/by-region/route.ts`
- `src/app/hikes/page.tsx`

**Testing Checklist:**
- [ ] Park dropdown shows all 10 National Parks
- [ ] Filtering by park works correctly
- [ ] URL params work: `/hikes?park=Yosemite National Park`
- [ ] Custom hike form shows park dropdown
- [ ] Search includes park filter
- [ ] No broken country/state references

**Estimated Time:** 2-3 hours

---

# TASK 2: Remove Trending Logic

## 🎯 Goal
Remove synthetic trending/rating logic and show all trails directly.

## 📊 Current State Analysis

**Trending Logic Location:**
- `src/app/api/hikes/trending/route.ts` - Generates fake ratings/reviews
- `src/components/TrendingHikesPanel.tsx` - Displays trending hikes
- `src/app/hikes/page.tsx` - Uses TrendingHikesPanel

**What Gets Removed:**
- Synthetic ratings (4.1-4.9)
- Synthetic review counts (120-1,500)
- Popularity scores (72-99)
- "Trending" filtering (>= 1,000 reviews)
- Seeded random generation based on hike ID

## ✅ Implementation Steps

### Step 2.1: Rename TrendingHikesPanel to HikesGrid
**File:** `src/components/TrendingHikesPanel.tsx` → `src/components/HikesGrid.tsx`

**Changes:**
1. Remove all rating/review display logic
2. Remove popularity score
3. Simplify to show: name, distance, elevation, difficulty, park
4. Remove "Use my location" feature
5. Keep pagination and park filtering

**Before (showing fake data):**
```tsx
<div className="flex items-center gap-1 text-sm">
  <span className="text-warning">★ {hike.rating}</span>
  <span className="text-base-content/60">({hike.reviews} reviews)</span>
</div>
```

**After (simple display):**
```tsx
<div className="flex items-center gap-2 text-sm text-base-content/70">
  <span>{hike.distanceMiles} mi</span>
  <span>•</span>
  <span>{hike.elevationGainFt} ft</span>
  <span>•</span>
  <span className="badge badge-sm">{hike.difficulty}</span>
</div>
```

### Step 2.2: Delete Trending API Endpoint
**File:** `src/app/api/hikes/trending/route.ts`

**Action:** Delete this file entirely (logic moved to `/api/hikes/by-park`)

### Step 2.3: Update Hikes Page
**File:** `src/app/hikes/page.tsx`

**Changes:**
1. Replace `TrendingHikesPanel` with `HikesGrid`
2. Remove duplicate `HikesList` (consolidate into one grid)
3. Update heading from "Trending Hikes" to "All Trails"

**Before:**
```tsx
<TrendingHikesPanel />
<HikesList />
```

**After:**
```tsx
<HikesGrid />
```

### Step 2.4: Simplify Trail Display
**New Component Structure:**

```tsx
// HikesGrid.tsx
export default function HikesGrid() {
  return (
    <div>
      <div className="flex gap-4 mb-6">
        {/* Park Filter */}
        <select value={park} onChange={handleParkChange}>
          <option value="">All National Parks</option>
          {parks.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Sort By */}
        <select value={sortBy} onChange={handleSortChange}>
          <option value="name">Name</option>
          <option value="distance">Distance</option>
          <option value="elevation">Elevation</option>
          <option value="difficulty">Difficulty</option>
        </select>
      </div>

      {/* Trail Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trails.map(trail => (
          <TrailCard key={trail.id} trail={trail} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination page={page} hasMore={hasMore} />
    </div>
  );
}
```

### Step 2.5: Remove Rating/Review References
**Files to Check:**
- Any component displaying ratings
- Any API returning rating data
- Database queries selecting rating fields

**Search and Remove:**
```bash
# Find all references to ratings/reviews
grep -r "rating" src/
grep -r "reviews" src/
grep -r "popularity" src/
grep -r "trending" src/
```

## 📝 Summary - Task 2

**Files to Delete:**
- `src/app/api/hikes/trending/route.ts`
- `src/components/TrendingHikesPanel.tsx` (rename to HikesGrid.tsx)

**Files to Modify:**
- `src/app/hikes/page.tsx`
- `src/components/HikesList.tsx` (maybe consolidate with HikesGrid)

**Testing Checklist:**
- [ ] No trending logic anywhere
- [ ] No fake ratings displayed
- [ ] All 1,102 trails visible
- [ ] Sorting works (name, distance, elevation, difficulty)
- [ ] Pagination works
- [ ] Park filtering works

**Estimated Time:** 1-2 hours

---

# TASK 3: Treadmill Simulation System

## 🎯 Goal
Allow users to simulate hiking trails on treadmill with smartwatch integration and gamification.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     HikeSim Platform                    │
├─────────────────────────────────────────────────────────┤
│  Web App (Next.js)                                      │
│  ├─ Trail Selection & Preview                          │
│  ├─ Simulation Dashboard (Real-time)                   │
│  ├─ Progress Tracking & Stats                          │
│  └─ Rewards & Achievements                             │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│              Smartwatch Integration Layer               │
├─────────────────────────────────────────────────────────┤
│  Apple HealthKit (iOS)                                  │
│  Google Fit API (Android)                               │
│  Garmin Connect API                                     │
│  Fitbit Web API                                         │
└─────────────────────────────────────────────────────────┘
                        ↕ Real-time Data
┌─────────────────────────────────────────────────────────┐
│                 Physical Treadmill                      │
│  ├─ Speed Control                                       │
│  ├─ Incline Control (Auto or Manual)                   │
│  └─ Heart Rate Monitor                                  │
└─────────────────────────────────────────────────────────┘
```

## 📋 Phase 3.1: Database Schema & Core Models

### New Database Models

```prisma
// prisma/schema.prisma

model TreadmillSimulation {
  id              String   @id @default(cuid())
  userId          String
  hikeId          String
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  status          SimulationStatus @default(IN_PROGRESS)

  // Target from trail
  targetDistanceMiles  Float
  targetElevationFt    Int
  targetDuration       Int?  // minutes (optional goal)

  // Actual progress
  currentDistanceMiles Float  @default(0)
  currentElevationFt   Int    @default(0)
  currentDuration      Int    @default(0)  // seconds
  progressPercent      Float  @default(0)

  // Treadmill settings
  currentSpeed         Float? // mph
  currentIncline       Float? // percentage

  // Performance data
  avgHeartRate         Int?
  maxHeartRate         Int?
  caloriesBurned       Int?

  // Segmented data (JSON)
  segments             Json   // [{ time, distance, elevation, hr, speed, incline }]

  // Gamification
  pointsEarned         Int    @default(0)
  badgesEarned         String[] // Array of badge IDs

  // Smartwatch connection
  deviceType           String? // "apple_watch", "garmin", "fitbit"
  deviceId             String?

  // Relationships
  user                 User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  hike                 Hike   @relation(fields: [hikeId], references: [id])

  // Indexes
  @@index([userId, status])
  @@index([hikeId])
}

enum SimulationStatus {
  IN_PROGRESS
  PAUSED
  COMPLETED
  ABANDONED
}

model SimulationCheckpoint {
  id              String   @id @default(cuid())
  simulationId    String
  timestamp       DateTime @default(now())

  distanceMiles   Float
  elevationFt     Int
  duration        Int      // seconds from start
  heartRate       Int?
  speed           Float?
  incline         Float?

  simulation      TreadmillSimulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)

  @@index([simulationId, timestamp])
}

model Badge {
  id              String   @id @default(cuid())
  name            String   @unique
  description     String
  iconUrl         String?
  category        BadgeCategory
  requirement     Json     // { type, value, condition }
  pointsAwarded   Int      @default(0)

  createdAt       DateTime @default(now())
}

enum BadgeCategory {
  DISTANCE_MILESTONE  // Complete 10 miles, 50 miles, 100 miles
  ELEVATION_GAIN      // Climb 5000ft, 10000ft, 50000ft
  TRAIL_COMPLETION    // Complete specific trails
  CONSISTENCY         // Complete 7 days in a row, 30 days in a row
  SPEED_ACHIEVEMENT   // Complete trail faster than target
  ENDURANCE           // Complete trail without pausing
  EXPLORER            // Complete trails in all 10 parks
}

model UserBadge {
  id              String   @id @default(cuid())
  userId          String
  badgeId         String
  earnedAt        DateTime @default(now())
  simulationId    String?  // Which simulation earned this

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge           Badge    @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@index([userId])
}

model UserStats {
  id                      String   @id @default(cuid())
  userId                  String   @unique

  // Lifetime stats
  totalDistanceMiles      Float    @default(0)
  totalElevationFt        Int      @default(0)
  totalDuration           Int      @default(0)  // seconds
  totalSimulations        Int      @default(0)
  completedSimulations    Int      @default(0)

  // Current week
  weekDistanceMiles       Float    @default(0)
  weekElevationFt         Int      @default(0)
  weekDuration            Int      @default(0)
  weekSimulations         Int      @default(0)

  // Achievements
  totalPoints             Int      @default(0)
  totalBadges             Int      @default(0)
  currentStreak           Int      @default(0)  // days
  longestStreak           Int      @default(0)

  // Personal records
  longestSimulation       Float?   // miles
  highestElevation        Int?     // feet
  fastestMile             Float?   // minutes

  updatedAt               DateTime @updatedAt
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Add to User model:
model User {
  // ... existing fields ...
  simulations     TreadmillSimulation[]
  badges          UserBadge[]
  stats           UserStats?
}

// Add to Hike model:
model Hike {
  // ... existing fields ...
  simulations     TreadmillSimulation[]
}
```

## 📋 Phase 3.2: Simulation Core Features

### Feature 1: Trail Preview & Simulation Setup

**New Page:** `src/app/simulations/[hikeId]/setup/page.tsx`

```tsx
export default async function SimulationSetup({ params }: { params: { hikeId: string } }) {
  const hike = await prisma.hike.findUnique({ where: { id: params.hikeId } });

  return (
    <div>
      <h1>Simulate: {hike.name}</h1>

      {/* Trail Overview */}
      <TrailPreview hike={hike} />

      {/* Simulation Settings */}
      <SimulationSettingsForm hike={hike} />

      {/* Start Button */}
      <button onClick={startSimulation}>
        Start Simulation
      </button>
    </div>
  );
}
```

**Component:** `src/components/simulation/SimulationSettingsForm.tsx`

```tsx
// Options for simulation
interface Settings {
  mode: 'guided' | 'free'; // Guided follows elevation profile, Free is manual
  speedControl: 'auto' | 'manual'; // Auto adjusts speed based on elevation
  inclineControl: 'auto' | 'manual'; // Auto follows trail elevation profile
  targetDuration?: number; // Optional time goal
  enableAudio: boolean; // Audio cues for incline changes
  difficulty: 'easy' | 'normal' | 'hard'; // Adjusts speed multipliers
}
```

### Feature 2: Live Simulation Dashboard

**New Page:** `src/app/simulations/[id]/live/page.tsx`

```tsx
'use client';

export default function LiveSimulation({ params }: { params: { id: string } }) {
  const [simulation, setSimulation] = useState<TreadmillSimulation>();
  const [currentStats, setCurrentStats] = useState({
    distance: 0,
    elevation: 0,
    duration: 0,
    heartRate: 0,
    speed: 0,
    incline: 0,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`/api/simulations/${params.id}/stream`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentStats(data);
    };

    return () => ws.close();
  }, [params.id]);

  return (
    <div className="simulation-dashboard">
      {/* Real-time Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Distance" value={`${currentStats.distance.toFixed(2)} mi`} />
        <StatCard label="Elevation" value={`${currentStats.elevation} ft`} />
        <StatCard label="Time" value={formatDuration(currentStats.duration)} />
        <StatCard label="Heart Rate" value={`${currentStats.heartRate} bpm`} />
      </div>

      {/* Elevation Profile with Current Position */}
      <ElevationProfileLive
        profilePoints={simulation.hike.profilePoints}
        currentDistance={currentStats.distance}
      />

      {/* Treadmill Controls */}
      <TreadmillControls
        currentSpeed={currentStats.speed}
        currentIncline={currentStats.incline}
        onSpeedChange={handleSpeedChange}
        onInclineChange={handleInclineChange}
      />

      {/* Control Buttons */}
      <div className="flex gap-4">
        <button onClick={pauseSimulation}>Pause</button>
        <button onClick={resumeSimulation}>Resume</button>
        <button onClick={endSimulation}>End Simulation</button>
      </div>
    </div>
  );
}
```

### Feature 3: Smartwatch Integration

**API Endpoints:**

1. **Apple HealthKit Integration**
   - File: `src/app/api/integrations/apple-health/route.ts`
   - Uses HealthKit API to read workout data
   - Requires iOS app or companion app

2. **Garmin Connect API**
   - File: `src/app/api/integrations/garmin/route.ts`
   - OAuth2 authentication
   - Real-time activity data streaming

3. **Google Fit API**
   - File: `src/app/api/integrations/google-fit/route.ts`
   - OAuth2 authentication
   - Activity data sync

**Implementation Steps:**

```typescript
// 1. Device Connection
POST /api/integrations/connect
{
  deviceType: "apple_watch" | "garmin" | "fitbit",
  authToken: string
}

// 2. Start Activity Stream
POST /api/simulations/{id}/start-stream
{
  deviceId: string
}

// 3. Receive Real-time Data (WebSocket)
WS /api/simulations/{id}/stream
{
  timestamp: Date,
  heartRate: number,
  distance: number,
  speed: number,
  calories: number
}

// 4. Stop Activity Stream
POST /api/simulations/{id}/stop-stream
```

### Feature 4: Auto-Incline Mapping

**Component:** `src/lib/simulation/incline-controller.ts`

```typescript
export class InclineController {
  constructor(
    private profilePoints: ProfilePoint[],
    private totalDistance: number
  ) {}

  /**
   * Calculate target incline for current distance
   */
  getTargetIncline(currentDistance: number): number {
    // Find current position in elevation profile
    const progress = currentDistance / this.totalDistance;
    const pointIndex = Math.floor(progress * this.profilePoints.length);

    if (pointIndex >= this.profilePoints.length - 1) {
      return 0; // End of trail
    }

    const current = this.profilePoints[pointIndex];
    const next = this.profilePoints[pointIndex + 1];

    // Calculate grade percentage
    const elevationChange = next.elevationFt - current.elevationFt;
    const distanceChange = next.distanceMiles - current.distanceMiles;
    const grade = (elevationChange / (distanceChange * 5280)) * 100; // Convert to percentage

    // Clamp to treadmill limits (typically -3% to 15%)
    return Math.max(-3, Math.min(15, grade));
  }

  /**
   * Smooth incline changes (avoid jerky movements)
   */
  smoothInclineChange(
    currentIncline: number,
    targetIncline: number,
    maxChangePerSecond: number = 0.5
  ): number {
    const difference = targetIncline - currentIncline;
    const change = Math.sign(difference) * Math.min(Math.abs(difference), maxChangePerSecond);
    return currentIncline + change;
  }
}
```

## 📋 Phase 3.3: Gamification System

### Feature 1: Points & Rewards

**Point Calculation:**

```typescript
// src/lib/gamification/points.ts

export function calculatePoints(simulation: TreadmillSimulation): number {
  let points = 0;

  // Base points for distance
  points += simulation.currentDistanceMiles * 10;

  // Bonus for elevation
  points += Math.floor(simulation.currentElevationFt / 100) * 5;

  // Bonus for completion
  if (simulation.progressPercent >= 100) {
    points += 50;
  }

  // Bonus for time efficiency (completed faster than average)
  if (simulation.targetDuration && simulation.currentDuration < simulation.targetDuration * 60) {
    points += 25;
  }

  // Bonus for heart rate consistency (stayed in target zone)
  if (simulation.avgHeartRate && isInTargetZone(simulation.avgHeartRate)) {
    points += 15;
  }

  return points;
}
```

### Feature 2: Badges & Achievements

**Pre-defined Badges:**

```typescript
// scripts/seed-badges.ts

const BADGES = [
  // Distance Milestones
  { name: "First Steps", requirement: { type: "distance", value: 1 }, points: 10 },
  { name: "5-Miler", requirement: { type: "distance", value: 5 }, points: 25 },
  { name: "Half Marathon", requirement: { type: "distance", value: 13.1 }, points: 100 },
  { name: "Century", requirement: { type: "total_distance", value: 100 }, points: 500 },

  // Elevation Milestones
  { name: "Hill Climber", requirement: { type: "elevation", value: 1000 }, points: 20 },
  { name: "Mountain Conqueror", requirement: { type: "elevation", value: 5000 }, points: 100 },
  { name: "Everest Base Camp", requirement: { type: "total_elevation", value: 17598 }, points: 1000 },

  // Trail Completion
  { name: "Yosemite Explorer", requirement: { type: "park_completion", value: "Yosemite" }, points: 200 },
  { name: "National Park Ranger", requirement: { type: "all_parks" }, points: 2000 },

  // Consistency
  { name: "7-Day Warrior", requirement: { type: "streak", value: 7 }, points: 75 },
  { name: "30-Day Champion", requirement: { type: "streak", value: 30 }, points: 300 },

  // Speed
  { name: "Speed Demon", requirement: { type: "avg_speed", value: 6 }, points: 50 },
  { name: "Trail Blazer", requirement: { type: "completion_time_under_target" }, points: 100 },

  // Endurance
  { name: "Iron Will", requirement: { type: "no_pause_completion" }, points: 150 },
  { name: "Ultra Endurance", requirement: { type: "distance_single", value: 26.2 }, points: 500 },
];
```

### Feature 3: Leaderboards

**New Page:** `src/app/leaderboards/page.tsx`

```tsx
export default async function Leaderboards() {
  return (
    <div>
      <h1>Leaderboards</h1>

      <div className="tabs">
        <button>Weekly</button>
        <button>Monthly</button>
        <button>All-Time</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distance Leaderboard */}
        <LeaderboardCard
          title="Most Distance"
          metric="miles"
          rankings={weeklyDistanceLeaders}
        />

        {/* Elevation Leaderboard */}
        <LeaderboardCard
          title="Most Elevation"
          metric="feet"
          rankings={weeklyElevationLeaders}
        />

        {/* Points Leaderboard */}
        <LeaderboardCard
          title="Most Points"
          metric="points"
          rankings={weeklyPointsLeaders}
        />
      </div>
    </div>
  );
}
```

## 📋 Phase 3.4: User Experience Features

### Feature 1: Simulation History & Analytics

**New Page:** `src/app/profile/simulations/page.tsx`

```tsx
export default async function SimulationHistory() {
  const simulations = await prisma.treadmillSimulation.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: 'desc' },
    include: { hike: true },
  });

  return (
    <div>
      <h1>Your Simulation History</h1>

      {/* Stats Overview */}
      <StatsGrid stats={userStats} />

      {/* Recent Simulations */}
      <div className="space-y-4">
        {simulations.map(sim => (
          <SimulationCard key={sim.id} simulation={sim} />
        ))}
      </div>
    </div>
  );
}
```

### Feature 2: Virtual Hiking Progress

**Concept:** Show user's position on an actual trail map as they progress

```tsx
// src/components/simulation/VirtualTrailMap.tsx

export function VirtualTrailMap({
  hike,
  currentDistance
}: {
  hike: Hike;
  currentDistance: number;
}) {
  // Calculate current GPS coordinates based on progress
  const currentPosition = interpolatePosition(
    hike.coordinates as [number, number][],
    currentDistance / hike.distanceMiles
  );

  return (
    <div className="trail-map">
      {/* Map with trail polyline */}
      <MapView
        coordinates={hike.coordinates}
        currentPosition={currentPosition}
      />

      {/* Milestone markers */}
      <Milestones
        profilePoints={hike.profilePoints}
        currentDistance={currentDistance}
      />
    </div>
  );
}
```

### Feature 3: Social Features

**Features:**
- Share completed simulations to social media
- Challenge friends to complete same trail
- Compare times with other users
- Create simulation groups

```typescript
// Share simulation result
POST /api/simulations/{id}/share
{
  platform: "twitter" | "facebook" | "strava",
  message: string
}

// Challenge friend
POST /api/challenges/create
{
  hikeId: string,
  friendUserId: string,
  targetTime?: number
}
```

## 📋 Phase 3.5: API Endpoints Summary

```
Simulation Management:
- POST   /api/simulations/create              - Start new simulation
- GET    /api/simulations/{id}                - Get simulation details
- PATCH  /api/simulations/{id}/pause          - Pause simulation
- PATCH  /api/simulations/{id}/resume         - Resume simulation
- PATCH  /api/simulations/{id}/complete       - Mark as complete
- DELETE /api/simulations/{id}                - Cancel simulation

Real-time Data:
- WS     /api/simulations/{id}/stream         - WebSocket for live data
- POST   /api/simulations/{id}/checkpoint     - Save progress checkpoint
- GET    /api/simulations/{id}/checkpoints    - Get all checkpoints

Device Integration:
- POST   /api/integrations/connect            - Connect smartwatch
- DELETE /api/integrations/disconnect         - Disconnect device
- POST   /api/integrations/sync               - Manual data sync
- GET    /api/integrations/status             - Check connection status

Gamification:
- GET    /api/badges                          - Get all badges
- GET    /api/badges/user/{userId}            - Get user's badges
- POST   /api/badges/award                    - Award badge (internal)
- GET    /api/leaderboards                    - Get leaderboards
- GET    /api/stats/user/{userId}             - Get user stats

Social:
- POST   /api/simulations/{id}/share          - Share to social
- POST   /api/challenges/create               - Create challenge
- GET    /api/challenges/user/{userId}        - Get user's challenges
```

## 📋 Phase 3.6: Implementation Timeline

### Phase 3.6.1: Foundation (Weeks 1-2)
**Goal:** Basic simulation without smartwatch

- [ ] Add database models (TreadmillSimulation, Badge, UserStats)
- [ ] Create simulation setup page
- [ ] Build basic simulation dashboard
- [ ] Implement manual data entry (distance, time, incline)
- [ ] Basic point calculation
- [ ] Simulation history page

**Deliverable:** Users can manually track treadmill hikes and earn points

### Phase 3.6.2: Smartwatch Integration (Weeks 3-6)
**Goal:** Connect to Apple Watch, Garmin, Fitbit

- [ ] Research and implement HealthKit API (Apple)
- [ ] Implement Garmin Connect API
- [ ] Implement Fitbit Web API
- [ ] Build WebSocket streaming infrastructure
- [ ] Real-time data sync and display
- [ ] Handle connection issues and errors

**Deliverable:** Users can connect smartwatches and stream live data

### Phase 3.6.3: Auto-Incline & Advanced Features (Weeks 7-8)
**Goal:** Guided simulation with automatic incline

- [ ] Build incline controller algorithm
- [ ] Implement elevation profile mapping
- [ ] Audio cues for incline changes
- [ ] Speed auto-adjustment based on difficulty
- [ ] Virtual trail map with current position

**Deliverable:** Full guided simulation experience

### Phase 3.6.4: Gamification & Social (Weeks 9-10)
**Goal:** Badges, leaderboards, challenges

- [ ] Seed badge data
- [ ] Implement badge award logic
- [ ] Build leaderboards (weekly, monthly, all-time)
- [ ] Social sharing integration
- [ ] Challenge system
- [ ] Profile page with stats and achievements

**Deliverable:** Complete gamified experience

### Phase 3.6.5: Polish & Testing (Weeks 11-12)
**Goal:** Bug fixes, optimization, user testing

- [ ] Beta testing with real users
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Mobile responsive design
- [ ] Documentation for users
- [ ] Analytics tracking

**Deliverable:** Production-ready treadmill simulation system

## 💰 Cost Estimates

**Third-party Services:**
- HealthKit: Free (Apple developer account $99/year)
- Garmin Connect API: Free (registration required)
- Fitbit Web API: Free (OAuth registration)
- Google Fit API: Free (API key required)

**Infrastructure:**
- WebSocket server (Pusher or self-hosted): $10-50/month
- Real-time database (Redis): $10-30/month
- Storage for simulation data: $5-20/month

**Total Estimated Monthly Cost:** $25-100

## 🎯 Success Metrics

**Key Performance Indicators:**
- Number of simulations started per day
- Completion rate (simulations finished vs abandoned)
- Average simulation duration
- Smartwatch connection success rate
- User engagement (returning users)
- Social sharing rate
- Badge collection rate

**Target Metrics (6 months post-launch):**
- 500+ active users
- 1,000+ simulations completed
- 70%+ completion rate
- 80%+ smartwatch connection success
- 30%+ weekly active users

---

## 📝 Summary - Task 3

**Complexity:** High (Long-term project, 12 weeks estimated)

**Key Technologies:**
- Apple HealthKit API
- Garmin Connect API
- Fitbit Web API
- Google Fit API
- WebSocket (real-time streaming)
- Redis (real-time data cache)

**New Database Models:** 6 models (TreadmillSimulation, SimulationCheckpoint, Badge, UserBadge, UserStats, plus updates to User and Hike)

**New API Endpoints:** 20+ endpoints

**New Pages:** 5+ new pages

**New Components:** 15+ new components

**Files to Create:** 50+ new files

**Estimated Development Time:** 12 weeks (3 months)

**Estimated Cost:** $25-100/month for services

---

# 🎯 Overall Priorities

## Immediate (Do First):
1. **Task 1: UI Cleanup** - Change to National Parks (2-3 hours)
2. **Task 2: Remove Trending** - Simplify trail display (1-2 hours)

**Total Time:** Half day

## Medium-term (After cleanup):
3. **Task 3 Phase 1:** Basic simulation without smartwatch (2 weeks)

## Long-term (Future):
3. **Task 3 Phase 2-5:** Full smartwatch integration + gamification (10 weeks)

---

**Document Status:** ✅ Complete and Ready for Implementation
**Last Updated:** January 25, 2026
