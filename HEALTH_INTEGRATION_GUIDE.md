# Health Platform Integration Guide

## Overview

HikeSim can sync workouts from:
- **Apple Health** (iOS) - via HealthKit
- **Google Fit** (Android) - via Google Fit API
- **Strava/Garmin/Fitbit** - via OAuth (future)

## Current Status

✅ Manual workout logging works now
⚠️ Apple Health/Google Fit require native builds (not Expo Go)

---

## Option 1: Quick Setup with expo-health-connect (Recommended)

### Step 1: Install Package
```bash
cd hikesim-mobile
npx expo install expo-health-connect
```

### Step 2: Update app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-health-connect",
        {
          "healthPermissions": [
            "Distance",
            "ExerciseSession",
            "HeartRate",
            "Steps",
            "ActiveCaloriesBurned",
            "TotalCaloriesBurned",
            "ElevationGained"
          ]
        }
      ]
    ]
  }
}
```

### Step 3: Update healthService.ts
```typescript
import {
  initialize,
  requestPermission,
  readRecords,
} from 'expo-health-connect';

// Initialize on app start
export async function initializeHealth(): Promise<boolean> {
  const isInitialized = await initialize();
  return isInitialized;
}

// Request permissions
export async function requestHealthPermissions(): Promise<boolean> {
  const granted = await requestPermission([
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Distance' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  ]);
  return granted.length > 0;
}

// Fetch workouts
export async function fetchWorkoutsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<WorkoutData[]> {
  const sessions = await readRecords('ExerciseSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    },
  });

  return sessions.map(session => ({
    source: isIOS ? 'APPLE_HEALTH' : 'GOOGLE_FIT',
    externalId: session.metadata?.id,
    workoutType: mapExerciseType(session.exerciseType),
    startedAt: session.startTime,
    endedAt: session.endTime,
    durationMinutes: (new Date(session.endTime).getTime() -
                      new Date(session.startTime).getTime()) / 60000,
  }));
}
```

### Step 4: Build with EAS (Required)
```bash
# expo-health-connect requires a native build
eas build --platform android --profile development
```

---

## Option 2: Full Native Implementation

For more control, use platform-specific packages:

### iOS: react-native-health
```bash
npx expo install react-native-health
```

**ios/Podfile** additions:
```ruby
pod 'react-native-health', :path => '../node_modules/react-native-health'
```

**Info.plist** permissions:
```xml
<key>NSHealthShareUsageDescription</key>
<string>HikeSim reads your workout data to sync hiking activities</string>
<key>NSHealthUpdateUsageDescription</key>
<string>HikeSim writes workout data to track your training</string>
```

**Enable HealthKit**:
1. Open Xcode
2. Select your target → Signing & Capabilities
3. Add "HealthKit" capability

### Android: react-native-google-fit
```bash
npx expo install react-native-google-fit
```

**android/app/build.gradle**:
```gradle
dependencies {
    implementation "com.google.android.gms:play-services-fitness:21.1.0"
    implementation "com.google.android.gms:play-services-auth:20.7.0"
}
```

**Google Cloud Console Setup**:
1. Create project at console.cloud.google.com
2. Enable "Fitness API"
3. Create OAuth 2.0 credentials
4. Add SHA-1 fingerprint of your app

---

## Full healthService.ts Implementation

```typescript
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions, HealthValue } from 'react-native-health';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import { workoutApi, WorkoutData, WorkoutSource } from './api';

const isIOS = Platform.OS === 'ios';

// iOS permissions
const healthKitPermissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.FlightsClimbed,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [AppleHealthKit.Constants.Permissions.Workout],
  },
};

// Android scopes
const googleFitScopes = [
  Scopes.FITNESS_ACTIVITY_READ,
  Scopes.FITNESS_ACTIVITY_WRITE,
  Scopes.FITNESS_LOCATION_READ,
  Scopes.FITNESS_BODY_READ,
];

// Initialize health platform
export async function initializeHealth(): Promise<boolean> {
  if (isIOS) {
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(healthKitPermissions, (err) => {
        resolve(!err);
      });
    });
  } else {
    const options = { scopes: googleFitScopes };
    const result = await GoogleFit.authorize(options);
    return result.success;
  }
}

// Fetch workouts from Apple Health
async function fetchFromAppleHealth(startDate: Date, endDate: Date): Promise<WorkoutData[]> {
  return new Promise((resolve) => {
    AppleHealthKit.getSamples(
      {
        type: 'Workout',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err, results: HealthValue[]) => {
        if (err || !results) {
          resolve([]);
          return;
        }

        const workouts = results
          .filter((w: any) =>
            w.activityName === 'HKWorkoutActivityTypeHiking' ||
            w.activityName === 'HKWorkoutActivityTypeWalking'
          )
          .map((w: any) => ({
            source: 'APPLE_HEALTH' as WorkoutSource,
            externalId: w.id,
            workoutType: w.activityName.includes('Hiking') ? 'HIKE' : 'WALK',
            distanceMiles: w.distance ? w.distance * 0.000621371 : undefined,
            durationMinutes: w.duration ? Math.round(w.duration / 60) : undefined,
            caloriesBurned: w.calories,
            startedAt: w.start,
            endedAt: w.end,
          }));

        resolve(workouts);
      }
    );
  });
}

// Fetch workouts from Google Fit
async function fetchFromGoogleFit(startDate: Date, endDate: Date): Promise<WorkoutData[]> {
  const options = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  const activities = await GoogleFit.getActivitySamples(options);

  return activities
    .filter(a =>
      a.activityType === 'walking' ||
      a.activityType === 'hiking' ||
      a.activityType === 7 || // Walking
      a.activityType === 35   // Hiking
    )
    .map(a => ({
      source: 'GOOGLE_FIT' as WorkoutSource,
      externalId: a.sourceName + '_' + a.start,
      workoutType: a.activityType === 35 || a.activityType === 'hiking' ? 'HIKE' : 'WALK',
      distanceMiles: a.distance ? a.distance * 0.000621371 : undefined,
      durationMinutes: a.duration ? Math.round(a.duration / 60000) : undefined,
      caloriesBurned: a.calories,
      startedAt: new Date(a.start).toISOString(),
      endedAt: new Date(a.end).toISOString(),
    }));
}

// Main sync function
export async function syncHealthWorkouts(
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<{ imported: number; skipped: number }> {

  const workouts = isIOS
    ? await fetchFromAppleHealth(startDate, endDate)
    : await fetchFromGoogleFit(startDate, endDate);

  if (workouts.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const platform = isIOS ? 'APPLE_HEALTH' : 'GOOGLE_FIT';
  const response = await workoutApi.syncFromHealth(platform, workouts);
  return response.data;
}
```

---

## Testing Health Integration

### iOS Simulator
1. Open Health app in simulator
2. Add sample workout data manually
3. Run your app and test sync

### Android Emulator
1. Install Google Fit app
2. Sign in with Google account
3. Add sample activities
4. Run your app and test sync

### Real Device
Best tested on real devices with actual health data.

---

## What Gets Synced

| Data | Apple Health | Google Fit |
|------|--------------|------------|
| Hiking workouts | ✅ | ✅ |
| Walking workouts | ✅ | ✅ |
| Distance | ✅ | ✅ |
| Duration | ✅ | ✅ |
| Calories | ✅ | ✅ |
| Heart rate | ✅ | ✅ |
| Elevation | ✅ (via flights) | ⚠️ Limited |

---

## Strava/Garmin/Fitbit Integration (Future)

These require OAuth authentication flows:

1. User clicks "Connect Strava"
2. Redirect to Strava login
3. User authorizes HikeSim
4. Strava sends webhook for new activities
5. Backend fetches activity details via API

This is more complex and requires:
- Strava API developer account
- OAuth redirect handling
- Webhook endpoint
- Background sync jobs

---

## Summary

| Approach | Effort | Expo Go | Native Build |
|----------|--------|---------|--------------|
| Manual logging | ✅ Done | ✅ Works | ✅ Works |
| expo-health-connect | Low | ❌ | ✅ Required |
| react-native-health | Medium | ❌ | ✅ Required |
| Strava OAuth | High | ✅ | ✅ |

**Recommended**: Start with manual logging, add `expo-health-connect` when you do your first EAS build for beta testing.
