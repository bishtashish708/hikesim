# AllTrails Data Import & UI Updates

## Changes Made

### 1. UI Improvements

#### Pagination Added
- **Before**: Only showed first 50 trails per park
- **After**: Shows up to 500 trails at once with "Load More" button
- Displays total trail count for each park

#### Profile Data Display Removed
- Removed "Profile Data: 0 elevation points" chip from hike detail page
- Now only shows elevation chart

### 2. Elevation Profile Generation

**Problem**: AllTrails CSV didn't include elevation profile points, causing "not enough elevation points to render a profile" error.

**Solution**: Auto-generate realistic elevation profiles based on:
- Trail distance
- Total elevation gain
- Route type (Loop, Out and Back, Point to Point)

**Profile Generation Logic**:
- **Out and Back**: Climb to midpoint, descend back
- **Loop**: Climb 40%, plateau 30%, descend 30%
- **Point to Point**: Gradual climb with natural variations

### 3. Import All Parks (Not Just 10)

**Before**: Only imported 10 target National Parks
**After**: Imports ALL US parks from AllTrails CSV

This gives users access to trails in:
- All National Parks
- State Parks
- National Forests
- Recreation Areas
- Wilderness Areas

## Scripts

### `scripts/import-all-parks.ts`
Complete re-import with:
- All US parks (not filtered to 10)
- Generated elevation profiles for every trail
- Smart duplicate detection
- Updates existing trails

### `scripts/import-alltrails-data.ts` (Original)
- Only imported 10 target parks
- No elevation profile generation

## Technical Details

### Elevation Profile Algorithm

```typescript
function generateProfilePoints(
  distanceMiles: number,
  elevationGainFt: number,
  routeType: string
): ProfilePoint[]
```

Generates 20-100 points based on trail length:
- Short trails (< 4 mi): 20 points
- Long trails (> 20 mi): 100 points
- Uses sine waves for realistic elevation curves

### Database Schema

Already includes:
- `profilePoints` (Json) - Array of {distanceMiles, elevationFt}
- `allTrailsId` - Unique trail identifier
- `features` - Trail features (views, waterfalls, etc.)
- `activities` - Supported activities
- `avgRating` - User rating (1-5)
- `numReviews` - Number of reviews

## Expected Results

After running `npx tsx scripts/import-all-parks.ts`:

1. **More Trails**: ~3,300 trails (up from 1,739)
2. **More Parks**: All US parks in CSV (up from 10)
3. **Working Elevation Charts**: Every trail will have a profile
4. **Better UX**: No more "not enough elevation points" errors

## Usage

### View All Trails
```bash
# Navigate to http://localhost:3000/hikes
# Select "All Parks" to see all ~3,300 trails
```

### Filter by Park
```bash
# Use dropdown to filter
# Shows trail count for each park
# Can load up to 500 trails at once
```

### Elevation Profiles
```bash
# Click any trail to see:
# - Interactive elevation chart
# - Generated profile based on trail characteristics
# - No more empty charts!
```
