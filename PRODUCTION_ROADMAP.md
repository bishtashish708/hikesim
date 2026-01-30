# 🚀 HikeSim - Production Readiness Roadmap

**Target:** Beta launch for friends in India & US (Android, iOS, Web)
**Vision:** Complete hiking training platform with wearable integration & hike simulation
**Status:** Currently at 40% completion (4/10 steps from PROJECT_STATUS.md)

---

## 📋 Table of Contents

1. [Phase 1: Authentication & Security](#phase-1-authentication--security)
2. [Phase 2: Mobile Apps (React Native/Expo)](#phase-2-mobile-apps-react-nativeexpo)
3. [Phase 3: Wearable Integration](#phase-3-wearable-integration)
4. [Phase 4: Hike Simulation Feature](#phase-4-hike-simulation-feature)
5. [Phase 5: UX/UI Improvements](#phase-5-uxui-improvements)
6. [Phase 6: Production Infrastructure](#phase-6-production-infrastructure)
7. [Phase 7: Beta Testing & Launch](#phase-7-beta-testing--launch)
8. [Cost Analysis](#cost-analysis)
9. [Timeline Estimate](#timeline-estimate)

---

## Phase 1: Authentication & Security
**Priority:** HIGH | **Estimated Duration:** 1-2 weeks

### 1.1 OAuth Integration (NextAuth Providers)

**Current State:**
- Email/password auth only
- Basic NextAuth setup exists

**Tasks:**
- [ ] Add Google OAuth provider
  - Register app in Google Cloud Console
  - Configure OAuth consent screen
  - Add credentials to `.env`
  - Update `src/lib/auth.ts` with Google provider
  - Test sign in/up flow

- [ ] Add Apple Sign In
  - Register app in Apple Developer Console
  - Configure Sign in with Apple capability
  - Add Apple provider to NextAuth
  - Handle Apple's privacy requirements (hidden email)
  - Test on iOS device

**Files to Modify:**
```
src/lib/auth.ts
src/app/login/page.tsx
prisma/schema.prisma (add OAuth fields to User model)
```

**New Dependencies:**
```bash
# No new packages needed - NextAuth supports these out of box
```

**Implementation Example:**
```typescript
// src/lib/auth.ts
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({ /* existing email/password */ }),
  ],
  // ... rest of config
};
```

### 1.2 Enhanced Security Features

- [ ] Email verification flow
  - Send verification email on signup
  - Create email templates
  - Add `emailVerified` field to User model
  - Implement verification token system

- [ ] Password reset functionality
  - "Forgot password" link on login page
  - Generate secure reset tokens
  - Email reset link
  - Password reset page

- [ ] Two-factor authentication (Optional for beta)
  - TOTP-based 2FA
  - QR code generation
  - Backup codes

- [ ] Rate limiting improvements
  - Add rate limiting to all API routes
  - Use Redis for distributed rate limiting (optional)
  - Current: 5 attempts/15 min on auth - expand to all endpoints

**New Dependencies:**
```bash
npm install nodemailer @react-email/components
npm install uuid jsonwebtoken
npm install --save-dev @types/nodemailer @types/jsonwebtoken
```

### 1.3 User Profile Enhancements

- [ ] Add profile fields to database
  ```prisma
  model User {
    // ... existing fields
    profilePicture   String?
    dateOfBirth      DateTime?
    height           Float?        // in cm
    weight           Float?        // in kg
    fitnessLevel     String?       // beginner, intermediate, advanced, expert
    location         String?       // city, country
    timezone         String?       // for workout scheduling
    preferences      Json?         // notification settings, units, etc.

    // OAuth fields
    provider         String?       // google, apple, email
    providerId       String?       // unique ID from OAuth provider
  }
  ```

- [ ] Profile settings page (`/settings`)
- [ ] Avatar upload (Cloudinary or Vercel Blob)
- [ ] Preference management (units, notifications)

---

## Phase 2: Mobile Apps (React Native/Expo)
**Priority:** HIGH | **Estimated Duration:** 3-4 weeks

### 2.1 Technology Choice: Expo (React Native)

**Why Expo?**
- Single codebase for iOS and Android
- Built-in support for Apple Watch, Google Fit APIs
- Easier deployment (Expo Go for testing, EAS Build for production)
- Your existing React/TypeScript skills transfer directly
- OTA updates for quick fixes

**Alternative:** Progressive Web App (PWA)
- Faster to ship (just add PWA config to Next.js)
- No app store approval needed
- BUT: Limited wearable integration, no native feel

**Recommendation:** Start with Expo for full native features

### 2.2 Project Setup

```bash
# Create new Expo project (in separate directory)
npx create-expo-app hikesim-mobile --template tabs
cd hikesim-mobile

# Install essential dependencies
npx expo install expo-router expo-auth-session expo-web-browser
npx expo install expo-location expo-sensors expo-health-connect
npx expo install @react-navigation/native @react-navigation/stack
npx expo install axios react-query @tanstack/react-query
```

### 2.3 App Structure

```
hikesim-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                  # Main app tabs
│   │   ├── index.tsx            # Dashboard
│   │   ├── hikes.tsx            # Browse hikes
│   │   ├── training.tsx         # Training plans
│   │   ├── simulate.tsx         # NEW: Hike simulation
│   │   └── profile.tsx          # User profile
│   ├── hike/[id].tsx            # Hike detail
│   └── workout/[id].tsx         # Workout detail
├── components/
│   ├── HikeCard.tsx
│   ├── TrainingWeekView.tsx
│   ├── SimulationControls.tsx   # NEW
│   └── WearableSync.tsx         # NEW
├── services/
│   ├── api.ts                   # API client to your backend
│   ├── wearables/
│   │   ├── appleHealth.ts       # HealthKit integration
│   │   ├── googleFit.ts         # Google Fit integration
│   │   ├── garmin.ts            # Garmin Connect API
│   │   └── fitbit.ts            # Fitbit Web API
│   └── simulation.ts            # Hike simulation logic
├── store/                       # State management (Zustand)
│   ├── authStore.ts
│   ├── workoutStore.ts
│   └── simulationStore.ts
└── app.json                     # Expo config
```

### 2.4 API Integration

**Shared Backend:** Reuse your existing Next.js API routes

```typescript
// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // Dev
  : 'https://hikesim.vercel.app/api'; // Production

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const hikeApi = {
  getAll: () => apiClient.get('/hikes/by-region'),
  getById: (id: string) => apiClient.get(`/hikes/${id}`),
  // ... other endpoints
};

export const trainingApi = {
  generatePlan: (data: any) => apiClient.post('/ai/generate-quick-plan', data),
  getMyPlans: () => apiClient.get('/training-plans'),
  // ... other endpoints
};
```

### 2.5 Key Mobile Features

- [ ] **Offline Support**
  - Cache hikes and training plans locally
  - Queue API requests when offline
  - Sync when connection restored
  - Use React Query with persistence

- [ ] **Push Notifications**
  - Workout reminders
  - Achievement notifications
  - Daily motivation
  - Use Expo Notifications

- [ ] **Native Navigation**
  - Tab bar for main sections
  - Stack navigation for details
  - Gesture-based navigation

- [ ] **Location Tracking**
  - Track outdoor hike simulations
  - GPS route recording
  - Elevation tracking
  - Use `expo-location`

### 2.6 iOS & Android Deployment

**iOS (TestFlight):**
```bash
# Build for iOS
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios
```

**Android (Google Play Beta):**
```bash
# Build for Android
eas build --platform android --profile preview

# Submit to Play Store
eas submit --platform android
```

**Requirements:**
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)
- App icons (1024x1024)
- Screenshots for both platforms
- Privacy policy URL
- App store descriptions

---

## Phase 3: Wearable Integration
**Priority:** HIGH | **Estimated Duration:** 3-4 weeks

### 3.1 Apple Health (HealthKit)

**Capabilities:**
- Read: Steps, distance, heart rate, calories, elevation, workouts
- Write: Log custom hiking workouts
- Live streaming during hike simulation

**Implementation:**

```typescript
// services/wearables/appleHealth.ts
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.FlightsClimbed,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Workout,
    ],
  },
};

export const initHealthKit = () => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) reject(error);
      else resolve(true);
    });
  });
};

// Get workout data for a date range
export const getWorkoutData = async (startDate: Date, endDate: Date) => {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getSamples(options, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Log a completed hike simulation
export const logHikeWorkout = async (
  startDate: Date,
  endDate: Date,
  distance: number, // meters
  elevation: number, // meters
  calories: number
) => {
  const workout = {
    type: 'hiking',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    energyBurned: calories,
    distance: distance,
    metadata: {
      elevation: elevation,
      source: 'HikeSim',
    },
  };

  return new Promise((resolve, reject) => {
    AppleHealthKit.saveWorkout(workout, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// Real-time data streaming during simulation
export const startLiveHealthTracking = (callback: (data: any) => void) => {
  const interval = setInterval(async () => {
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);

    const data = await getWorkoutData(fiveSecondsAgo, now);
    callback(data);
  }, 5000); // Update every 5 seconds

  return () => clearInterval(interval);
};
```

**Dependencies:**
```bash
npx expo install react-native-health
# For Apple Watch complications:
npx expo install expo-apple-watch (experimental)
```

### 3.2 Google Fit / Health Connect (Android)

**Capabilities:**
- Read: Steps, distance, heart rate, calories, elevation
- Write: Log custom workouts
- Works with Wear OS devices

**Implementation:**

```typescript
// services/wearables/googleFit.ts
import GoogleFit, { Scopes } from 'react-native-google-fit';

const options = {
  scopes: [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_ACTIVITY_WRITE,
    Scopes.FITNESS_LOCATION_READ,
    Scopes.FITNESS_BODY_READ,
  ],
};

export const initGoogleFit = async () => {
  return await GoogleFit.authorize(options);
};

export const getWorkoutData = async (startDate: Date, endDate: Date) => {
  const steps = await GoogleFit.getDailyStepCountSamples({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const distance = await GoogleFit.getDailyDistanceSamples({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return { steps, distance };
};

export const logHikeWorkout = async (
  startDate: Date,
  endDate: Date,
  distance: number,
  elevation: number,
  calories: number
) => {
  const workout = {
    id: `hikesim_${Date.now()}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    activityName: 'hiking',
    distance: distance,
    calories: calories,
    metadata: {
      elevation: elevation,
    },
  };

  return await GoogleFit.saveWorkout(workout);
};
```

**Dependencies:**
```bash
npm install react-native-google-fit
```

### 3.3 Garmin Connect API

**Capabilities:**
- Read: Activities, steps, heart rate, sleep, stress
- Write: Not supported (Garmin devices sync to Garmin Connect, not vice versa)
- OAuth 1.0a based

**Implementation:**

```typescript
// services/wearables/garmin.ts
import axios from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';

// OAuth 1.0a setup
const oauth = new OAuth({
  consumer: {
    key: process.env.GARMIN_CONSUMER_KEY!,
    secret: process.env.GARMIN_CONSUMER_SECRET!,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

// Note: Garmin requires OAuth flow to get user tokens
// This is a simplified example

export const getGarminActivities = async (
  userAccessToken: string,
  userAccessSecret: string,
  startDate: Date,
  endDate: Date
) => {
  const requestData = {
    url: `${GARMIN_API_BASE}/activities`,
    method: 'GET',
    params: {
      uploadStartTimeInSeconds: Math.floor(startDate.getTime() / 1000),
      uploadEndTimeInSeconds: Math.floor(endDate.getTime() / 1000),
    },
  };

  const token = {
    key: userAccessToken,
    secret: userAccessSecret,
  };

  const headers = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await axios.get(requestData.url, {
    headers,
    params: requestData.params,
  });

  return response.data;
};
```

**Challenge:** Garmin requires OAuth 1.0a flow and developer account approval
**Recommendation:** Start with HealthKit/Google Fit, add Garmin in Phase 2 of beta

### 3.4 Fitbit Web API

**Capabilities:**
- Read: Activities, heart rate, steps, sleep
- Write: Log activities (limited)
- OAuth 2.0 based (easier than Garmin)

**Implementation:**

```typescript
// services/wearables/fitbit.ts
import axios from 'axios';

const FITBIT_API_BASE = 'https://api.fitbit.com/1';

export const getFitbitActivities = async (
  accessToken: string,
  date: string // YYYY-MM-DD
) => {
  const response = await axios.get(
    `${FITBIT_API_BASE}/user/-/activities/date/${date}.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};

export const logFitbitActivity = async (
  accessToken: string,
  activityData: {
    activityName: string;
    startTime: string; // HH:mm
    durationMillis: number;
    date: string; // YYYY-MM-DD
    distance: number; // km
  }
) => {
  const response = await axios.post(
    `${FITBIT_API_BASE}/user/-/activities.json`,
    activityData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};
```

### 3.5 Unified Wearable Service

**Create abstraction layer for all wearables:**

```typescript
// services/wearables/index.ts
export enum WearableProvider {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  GARMIN = 'garmin',
  FITBIT = 'fitbit',
}

export interface WorkoutData {
  provider: WearableProvider;
  startTime: Date;
  endTime: Date;
  distance: number; // meters
  elevation: number; // meters
  steps: number;
  heartRateAvg: number;
  heartRateMax: number;
  calories: number;
  activityType: 'hiking' | 'walking' | 'running' | 'treadmill';
}

export class WearableService {
  async connectProvider(provider: WearableProvider): Promise<boolean> {
    switch (provider) {
      case WearableProvider.APPLE_HEALTH:
        return await initHealthKit();
      case WearableProvider.GOOGLE_FIT:
        return await initGoogleFit();
      // ... other providers
    }
  }

  async getWorkoutData(
    provider: WearableProvider,
    startDate: Date,
    endDate: Date
  ): Promise<WorkoutData[]> {
    // Fetch from appropriate provider
    // Normalize data to common format
    // Return unified WorkoutData array
  }

  async syncToBackend(workoutData: WorkoutData): Promise<void> {
    // POST to /api/workouts/sync
    await apiClient.post('/workouts/sync', workoutData);
  }
}
```

### 3.6 Backend: Store Wearable Data

**New Database Models:**

```prisma
// prisma/schema.prisma

model WearableConnection {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider      String   // apple_health, google_fit, garmin, fitbit
  accessToken   String?  @db.Text  // Encrypted
  refreshToken  String?  @db.Text  // Encrypted
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
  connectedAt   DateTime @default(now())
  lastSyncedAt  DateTime?

  @@unique([userId, provider])
  @@index([userId])
}

model WorkoutActivity {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Source
  provider          String   // apple_health, google_fit, manual, etc.
  externalId        String?  // ID from wearable provider

  // Activity details
  activityType      String   // hiking, walking, running, treadmill
  startTime         DateTime
  endTime           DateTime
  durationMinutes   Int

  // Metrics
  distanceMeters    Float
  elevationMeters   Float
  steps             Int?
  heartRateAvg      Int?
  heartRateMax      Int?
  caloriesBurned    Int?

  // Hike simulation link (if applicable)
  simulationId      String?
  simulation        HikeSimulation? @relation(fields: [simulationId], references: [id])

  // Metadata
  createdAt         DateTime @default(now())
  syncedAt          DateTime @default(now())
  metadata          Json?    // Additional provider-specific data

  @@index([userId, startTime])
  @@index([simulationId])
}
```

**API Routes:**

```typescript
// src/app/api/wearables/connect/route.ts
export async function POST(request: Request) {
  const { provider, accessToken, refreshToken } = await request.json();
  const session = await getServerSession(authOptions);

  // Store encrypted tokens
  await prisma.wearableConnection.upsert({
    where: {
      userId_provider: {
        userId: session.user.id,
        provider,
      },
    },
    update: {
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      lastSyncedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      provider,
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
    },
  });

  return NextResponse.json({ success: true });
}

// src/app/api/workouts/sync/route.ts
export async function POST(request: Request) {
  const workoutData: WorkoutData = await request.json();
  const session = await getServerSession(authOptions);

  // Save workout to database
  await prisma.workoutActivity.create({
    data: {
      userId: session.user.id,
      provider: workoutData.provider,
      activityType: workoutData.activityType,
      startTime: workoutData.startTime,
      endTime: workoutData.endTime,
      durationMinutes: Math.floor(
        (workoutData.endTime.getTime() - workoutData.startTime.getTime()) / 60000
      ),
      distanceMeters: workoutData.distance,
      elevationMeters: workoutData.elevation,
      steps: workoutData.steps,
      heartRateAvg: workoutData.heartRateAvg,
      heartRateMax: workoutData.heartRateMax,
      caloriesBurned: workoutData.calories,
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## Phase 4: Hike Simulation Feature
**Priority:** HIGH | **Estimated Duration:** 2-3 weeks

### 4.1 Core Concept

**User Flow:**
1. User selects a hike to simulate
2. Choose simulation mode: Treadmill or Outdoor
3. View real-time progress mapped to hike elevation profile
4. Track with Apple Watch/Garmin during simulation
5. Complete in single session OR split across multiple days
6. Earn achievement badge upon completion
7. Share completion on social (optional)

### 4.2 Database Schema

```prisma
// prisma/schema.prisma

model HikeSimulation {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hikeId            String
  hike              Hike     @relation(fields: [hikeId], references: [id])

  // Simulation settings
  mode              String   // 'treadmill' | 'outdoor'
  targetDistanceMiles Float  // From hike
  targetElevationFt   Float  // From hike

  // Progress tracking
  status            String   @default("in_progress") // in_progress, completed, abandoned
  progressPercent   Float    @default(0)
  currentDistanceMiles Float @default(0)
  currentElevationFt   Float @default(0)

  // Session tracking
  sessions          SimulationSession[]
  totalDurationMinutes Int  @default(0)
  totalCalories        Int  @default(0)

  // Completion
  startedAt         DateTime @default(now())
  completedAt       DateTime?
  achievementAwarded Boolean @default(false)

  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId, status])
  @@index([hikeId])
}

model SimulationSession {
  id                String   @id @default(cuid())
  simulationId      String
  simulation        HikeSimulation @relation(fields: [simulationId], references: [id], onDelete: Cascade)

  // Session details
  sessionNumber     Int      // 1, 2, 3... for multi-day completions
  startTime         DateTime
  endTime           DateTime?
  durationMinutes   Int      @default(0)

  // Progress in this session
  distanceMiles     Float    @default(0)
  elevationFt       Float    @default(0)
  steps             Int?
  avgHeartRate      Int?
  caloriesBurned    Int?

  // Wearable data link
  workoutActivityId String?
  workoutActivity   WorkoutActivity? @relation(fields: [workoutActivityId], references: [id])

  // GPS data for outdoor simulations
  gpsRoute          Json?    // Array of { lat, lng, elevation, timestamp }

  createdAt         DateTime @default(now())

  @@index([simulationId])
}

model Achievement {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type              String   // 'hike_completion', 'streak', 'distance_milestone'
  title             String
  description       String
  iconUrl           String?

  // Reference to what earned this
  simulationId      String?
  simulation        HikeSimulation? @relation(fields: [simulationId], references: [id])

  earnedAt          DateTime @default(now())

  @@index([userId, earnedAt])
}
```

### 4.3 Mobile App: Simulation Screen

```typescript
// app/(tabs)/simulate.tsx
import { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { WearableService } from '@/services/wearables';
import { apiClient } from '@/services/api';

export default function SimulateScreen({ route }) {
  const { hikeId } = route.params;
  const [simulation, setSimulation] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Start new simulation
  const startSimulation = async (mode: 'treadmill' | 'outdoor') => {
    const response = await apiClient.post('/simulations/start', {
      hikeId,
      mode,
    });
    setSimulation(response.data);
    startSession();
  };

  // Start a session (can be multiple sessions for one simulation)
  const startSession = async () => {
    const response = await apiClient.post(`/simulations/${simulation.id}/sessions/start`);
    setCurrentSession(response.data);
    setIsTracking(true);

    // Start wearable tracking
    if (Platform.OS === 'ios') {
      const stopTracking = startLiveHealthTracking((data) => {
        setLiveData(data);
        updateSessionProgress(data);
      });
    }
  };

  // Update session with live data
  const updateSessionProgress = async (data: any) => {
    await apiClient.patch(`/simulations/sessions/${currentSession.id}`, {
      distanceMiles: data.distance / 1609.34, // meters to miles
      elevationFt: data.elevation * 3.28084, // meters to feet
      steps: data.steps,
      heartRate: data.heartRate,
      calories: data.calories,
    });

    // Refresh simulation progress
    const updated = await apiClient.get(`/simulations/${simulation.id}`);
    setSimulation(updated.data);
  };

  // Pause/End session
  const endSession = async () => {
    setIsTracking(false);
    await apiClient.post(`/simulations/sessions/${currentSession.id}/end`);

    // Check if simulation completed
    const updated = await apiClient.get(`/simulations/${simulation.id}`);
    if (updated.data.status === 'completed') {
      showCompletionCelebration();
      awardAchievement();
    }
  };

  const awardAchievement = async () => {
    await apiClient.post('/achievements/award', {
      simulationId: simulation.id,
      type: 'hike_completion',
    });
  };

  return (
    <View>
      {!simulation ? (
        <>
          <Text>Choose Simulation Mode:</Text>
          <Button title="Treadmill" onPress={() => startSimulation('treadmill')} />
          <Button title="Outdoor" onPress={() => startSimulation('outdoor')} />
        </>
      ) : (
        <>
          <Text>Progress: {simulation.progressPercent}%</Text>
          <Text>Distance: {simulation.currentDistanceMiles} / {simulation.targetDistanceMiles} mi</Text>
          <Text>Elevation: {simulation.currentElevationFt} / {simulation.targetElevationFt} ft</Text>

          {/* Elevation profile with current position indicator */}
          <ElevationProfileView
            hike={hike}
            currentProgress={simulation.progressPercent}
          />

          {/* Live metrics from wearable */}
          {isTracking && liveData && (
            <View>
              <Text>♥ {liveData.heartRate} bpm</Text>
              <Text>🔥 {liveData.calories} cal</Text>
              <Text>👣 {liveData.steps} steps</Text>
            </View>
          )}

          {!isTracking ? (
            <Button title="Start Session" onPress={startSession} />
          ) : (
            <Button title="End Session" onPress={endSession} />
          )}
        </>
      )}
    </View>
  );
}
```

### 4.4 Backend: Simulation API Routes

```typescript
// src/app/api/simulations/start/route.ts
export async function POST(request: Request) {
  const { hikeId, mode } = await request.json();
  const session = await getServerSession(authOptions);

  const hike = await prisma.hike.findUnique({ where: { id: hikeId } });

  const simulation = await prisma.hikeSimulation.create({
    data: {
      userId: session.user.id,
      hikeId,
      mode,
      targetDistanceMiles: hike.distanceMiles,
      targetElevationFt: hike.elevationGainFt,
    },
  });

  return NextResponse.json(simulation);
}

// src/app/api/simulations/[id]/sessions/start/route.ts
export async function POST(request: Request, { params }) {
  const { id } = params;
  const session = await getServerSession(authOptions);

  // Get current session count
  const existingSessions = await prisma.simulationSession.count({
    where: { simulationId: id },
  });

  const simulationSession = await prisma.simulationSession.create({
    data: {
      simulationId: id,
      sessionNumber: existingSessions + 1,
      startTime: new Date(),
    },
  });

  return NextResponse.json(simulationSession);
}

// src/app/api/simulations/sessions/[id]/route.ts
export async function PATCH(request: Request, { params }) {
  const { id } = params;
  const data = await request.json();

  // Update session
  const updatedSession = await prisma.simulationSession.update({
    where: { id },
    data: {
      distanceMiles: data.distanceMiles,
      elevationFt: data.elevationFt,
      steps: data.steps,
      avgHeartRate: data.heartRate,
      caloriesBurned: data.calories,
    },
  });

  // Update parent simulation progress
  const allSessions = await prisma.simulationSession.findMany({
    where: { simulationId: updatedSession.simulationId },
  });

  const totalDistance = allSessions.reduce((sum, s) => sum + s.distanceMiles, 0);
  const totalElevation = allSessions.reduce((sum, s) => sum + s.elevationFt, 0);

  const simulation = await prisma.hikeSimulation.findUnique({
    where: { id: updatedSession.simulationId },
  });

  const progressPercent = Math.min(
    100,
    (totalDistance / simulation.targetDistanceMiles) * 50 +
    (totalElevation / simulation.targetElevationFt) * 50
  );

  const isCompleted = progressPercent >= 99; // Allow 1% margin

  await prisma.hikeSimulation.update({
    where: { id: updatedSession.simulationId },
    data: {
      currentDistanceMiles: totalDistance,
      currentElevationFt: totalElevation,
      progressPercent,
      status: isCompleted ? 'completed' : 'in_progress',
      completedAt: isCompleted ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true });
}
```

### 4.5 Challenges & Solutions

**Challenge 1: Combining multi-day Apple Watch data**

**Solution:**
- Each session is a separate `SimulationSession` record
- Link to `WorkoutActivity` records from wearable syncs
- Aggregate all sessions to calculate total progress
- Use `simulationId` to group related sessions

**Challenge 2: Treadmill vs Outdoor accuracy**

**Treadmill:**
- Manual elevation input (most treadmills don't auto-report elevation)
- Use distance + time to estimate elevation based on hike profile
- User can manually adjust incline to match target elevation at each mile marker

**Outdoor:**
- GPS elevation can be inaccurate
- Use barometric altimeter data from Apple Watch (more accurate)
- Smooth elevation data with moving average

**Challenge 3: Progress calculation when user goes off-pace**

**Solution:**
- Don't require matching exact hike profile
- Track two metrics: distance covered AND elevation gained
- Progress = (distance% × 0.5) + (elevation% × 0.5)
- Allow completion when both metrics reach ~100%

### 4.6 Achievement System

```typescript
// src/lib/achievements.ts

export const ACHIEVEMENTS = {
  FIRST_HIKE: {
    id: 'first_hike',
    title: 'First Summit',
    description: 'Complete your first hike simulation',
    icon: '🏔️',
  },
  FIVE_HIKES: {
    id: 'five_hikes',
    title: 'Trail Enthusiast',
    description: 'Complete 5 hike simulations',
    icon: '🥾',
  },
  VERTICAL_MILE: {
    id: 'vertical_mile',
    title: 'Vertical Mile',
    description: 'Gain 5,280 feet of elevation (1 mile vertical)',
    icon: '⛰️',
  },
  MARATHON_DISTANCE: {
    id: 'marathon_distance',
    title: 'Marathon Hiker',
    description: 'Complete 26.2 miles across all simulations',
    icon: '🏃',
  },
  // ... more achievements
};

export async function checkAndAwardAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      simulations: { where: { status: 'completed' } },
      achievements: true,
    },
  });

  const completedCount = user.simulations.length;
  const totalElevation = user.simulations.reduce(
    (sum, s) => sum + s.targetElevationFt, 0
  );

  // Award first hike achievement
  if (completedCount >= 1 && !hasAchievement(user, 'first_hike')) {
    await awardAchievement(userId, ACHIEVEMENTS.FIRST_HIKE);
  }

  // Award vertical mile
  if (totalElevation >= 5280 && !hasAchievement(user, 'vertical_mile')) {
    await awardAchievement(userId, ACHIEVEMENTS.VERTICAL_MILE);
  }

  // ... check other achievements
}
```

---

## Phase 5: UX/UI Improvements
**Priority:** MEDIUM | **Estimated Duration:** 2-3 weeks

### 5.1 Web Experience Improvements

**Current Issues (from PROJECT_STATUS.md):**
- Prerender error on landing page
- Plan adjustment UI not connected
- Mobile responsiveness could be better

**Tasks:**

- [ ] **Fix Prerender Error**
  ```tsx
  // src/app/page.tsx
  import { Suspense } from 'react';

  export default function Home() {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <HomeContent />
      </Suspense>
    );
  }
  ```

- [ ] **Connect Plan Adjustment UI**
  - Implement modal with feedback form
  - Call existing `/api/ai/adjust-plan` endpoint
  - Show diff between old and new plan
  - Allow user to accept/reject changes

- [ ] **Mobile-First Redesign**
  - Bottom navigation for mobile web
  - Larger touch targets (min 44x44px)
  - Swipe gestures for navigation
  - Improved forms (use native date/number inputs)

- [ ] **Loading States & Skeletons**
  - Replace spinners with skeleton screens
  - Optimistic UI updates
  - Better error messages

- [ ] **Dark Mode**
  - Add theme toggle
  - Persist preference in localStorage
  - Update all components for dark theme
  - Use Tailwind dark: variants

### 5.2 Mobile App UI Polish

- [ ] **Onboarding Flow**
  - Welcome screens (3 screens max)
  - Swipeable tutorial
  - Request permissions (location, health, notifications)
  - Skip option

- [ ] **Micro-interactions**
  - Success animations (Lottie)
  - Haptic feedback on key actions
  - Pull-to-refresh
  - Smooth page transitions

- [ ] **Accessibility**
  - Screen reader support
  - Sufficient color contrast (WCAG AA)
  - Keyboard navigation
  - Font scaling support

### 5.3 Design System

**Create shared component library:**

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onPress: () => void;
}

export function Button({ variant, size, loading, ...props }: ButtonProps) {
  // Consistent styling across web and mobile
}

// More components:
// - Input.tsx
// - Card.tsx
// - Badge.tsx
// - Avatar.tsx
// - Modal.tsx
// - Alert.tsx
```

**Design tokens:**

```typescript
// constants/theme.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... up to 900
  },
  success: { /* ... */ },
  error: { /* ... */ },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  body: { fontSize: 16, fontWeight: 'normal' },
  // ...
};
```

### 5.4 User Testing & Feedback

- [ ] Set up feedback widget (e.g., Canny, UserVoice)
- [ ] Add in-app feedback form
- [ ] Analytics (PostHog, Mixpanel, or Google Analytics)
- [ ] Error tracking (Sentry)
- [ ] User session recording (LogRocket - optional)

---

## Phase 6: Production Infrastructure
**Priority:** HIGH | **Estimated Duration:** 1-2 weeks

### 6.1 Hosting & Deployment

**Web App (Next.js):**

**Option 1: Vercel (Recommended)**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Serverless functions for API routes
- Preview deployments for PRs
- Free tier: 100GB bandwidth, unlimited requests

**Setup:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Environment Variables:**
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://hikesim.app
ANTHROPIC_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
```

**Option 2: Self-hosted (VPS)**
- More control
- Lower cost at scale
- Use DigitalOcean, AWS, or Railway
- Requires Docker setup and Nginx

**Mobile Apps:**

**iOS:**
- Deploy via TestFlight for beta (free)
- App Store after beta testing ($99/year Apple Developer)

**Android:**
- Deploy via Google Play Internal Testing (free)
- Google Play Beta/Production ($25 one-time)

### 6.2 Database Optimization

**Current:** Neon PostgreSQL (free tier)

**Optimizations:**

- [ ] **Indexes**
  ```prisma
  @@index([userId, createdAt])
  @@index([hikeId, difficulty])
  @@index([status])
  ```

- [ ] **Connection Pooling**
  - Use Prisma connection pooling
  - Set `connection_limit` in DATABASE_URL
  - Consider PgBouncer for many connections

- [ ] **Caching**
  - Cache hike data (rarely changes)
  - Use Redis or Vercel KV
  - Cache GET requests for 5-10 minutes

- [ ] **Backups**
  ```bash
  # Automated daily backups
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

  # Upload to S3/Cloudflare R2
  ```

### 6.3 API Rate Limiting & Security

- [ ] **Rate Limiting**
  ```typescript
  // middleware.ts
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  });

  export async function middleware(request: Request) {
    const ip = request.ip ?? '127.0.0.1';
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return new Response('Too many requests', { status: 429 });
    }

    return NextResponse.next();
  }
  ```

- [ ] **CORS Configuration**
  ```typescript
  // next.config.js
  module.exports = {
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: 'https://hikesim.app' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
          ],
        },
      ];
    },
  };
  ```

- [ ] **Input Validation**
  - Use Zod for schema validation
  - Sanitize all user inputs
  - Prevent SQL injection (Prisma handles this)

### 6.4 Monitoring & Logging

- [ ] **Error Tracking: Sentry**
  ```bash
  npm install @sentry/nextjs @sentry/react-native
  ```

  ```typescript
  // sentry.client.config.ts
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
  ```

- [ ] **Performance Monitoring**
  - Vercel Analytics (free)
  - Core Web Vitals tracking
  - API response time monitoring

- [ ] **Uptime Monitoring**
  - Use UptimeRobot (free)
  - Ping every 5 minutes
  - Email/SMS alerts on downtime

### 6.5 CDN & Asset Optimization

- [ ] **Image Optimization**
  - Use Next.js Image component
  - Serve WebP/AVIF formats
  - Lazy load images
  - Consider Cloudinary for uploads

- [ ] **Code Splitting**
  - Already handled by Next.js
  - Use dynamic imports for heavy components
  - Keep bundle size < 200KB initial load

---

## Phase 7: Beta Testing & Launch
**Priority:** HIGH | **Estimated Duration:** 2-4 weeks

### 7.1 Beta Testing Strategy

**Goals:**
- Test with 20-30 friends in India & US
- Gather feedback on UX, bugs, and features
- Validate wearable integrations
- Test performance under real-world usage

**Beta Channels:**

**iOS (TestFlight):**
- Max 10,000 testers (way more than you need)
- Invite via email or public link
- Automatic crash reporting
- Feedback submission built-in

**Android (Google Play Internal Testing):**
- Invite via email
- No limit on testers
- Opt-in alpha/beta tracks

**Web:**
- Deploy to staging.hikesim.app
- Use feature flags to control access
- Password-protect beta site

### 7.2 Beta Tester Onboarding

**Invitation Email Template:**

```
Subject: You're invited to beta test HikeSim 🏔️

Hi [Name],

You're invited to be one of the first to try HikeSim - a hiking training app
that creates personalized workout plans and lets you simulate real hikes!

What you'll get:
✅ AI-powered training plans for any hike
✅ Apple Watch / Garmin / Fitbit integration
✅ Virtual hike simulations on treadmill or outdoors
✅ Achievement badges and progress tracking

How to join:
- iOS: [TestFlight link]
- Android: [Google Play beta link]
- Web: https://beta.hikesim.app

We'd love your feedback! Please use the in-app feedback button or reply to
this email with any thoughts.

Happy hiking!
- [Your Name]
```

### 7.3 Feedback Collection

- [ ] **In-app feedback button**
  - "Report a bug"
  - "Suggest a feature"
  - "Send feedback"

- [ ] **Weekly check-ins**
  - Email beta testers
  - Ask specific questions
  - Share what's been fixed

- [ ] **Metrics to track**
  - Daily active users (DAU)
  - Weekly active users (WAU)
  - Training plan generation rate
  - Hike simulation completion rate
  - Wearable connection rate
  - Crash rate
  - Average session length

### 7.4 Launch Checklist

**Pre-launch:**

- [ ] All features tested on iOS, Android, and web
- [ ] No critical bugs
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App store assets ready (screenshots, descriptions)
- [ ] Social media accounts created (optional)
- [ ] Landing page with email signup

**Launch Day:**

- [ ] Submit iOS app to App Store
- [ ] Submit Android app to Google Play
- [ ] Deploy web app to production
- [ ] Send launch email to beta testers
- [ ] Post on social media (if applicable)
- [ ] Monitor error logs and user feedback

**Post-launch:**

- [ ] Respond to user reviews
- [ ] Fix urgent bugs within 24 hours
- [ ] Weekly updates to address feedback
- [ ] Plan next features based on user requests

---

## Cost Analysis

### Development Costs (One-time)

| Item | Cost | Notes |
|------|------|-------|
| Apple Developer Account | $99/year | Required for iOS |
| Google Play Developer | $25 one-time | Required for Android |
| Domain (hikesim.app) | $12/year | Namecheap, Cloudflare |
| **Total** | **$136 first year** | $111/year after |

### Operating Costs (Monthly)

| Service | Free Tier | Paid Tier | Estimated for 100 Users |
|---------|-----------|-----------|-------------------------|
| **Hosting (Vercel)** | 100GB bandwidth | $20/month | Free |
| **Database (Neon)** | 0.5GB storage | $19/month | Free |
| **AI API (Anthropic)** | Pay-as-you-go | - | $5/month |
| **Redis (Upstash)** | 10K requests/day | $10/month | Free |
| **Error Tracking (Sentry)** | 5K events/month | $26/month | Free |
| **Email (Resend)** | 100 emails/day | $20/month | Free |
| **Image Storage (Cloudinary)** | 25GB/month | $99/month | Free |
| ****Total**** | - | - | **~$5/month** |

**For 1,000 Users:** ~$50-75/month
**For 10,000 Users:** ~$200-300/month

**Revenue Options (Future):**
- Freemium: Free basic plans, $4.99/month for premium features
- One-time purchases: $9.99 for custom plan builder
- No ads (keep it clean and user-friendly)

---

## Timeline Estimate

### Conservative Estimate (Part-time work, ~15 hours/week)

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Auth & Security** | 2 weeks | OAuth, email verification, password reset |
| **Phase 2: Mobile Apps** | 4 weeks | Expo setup, screens, API integration |
| **Phase 3: Wearable Integration** | 4 weeks | HealthKit, Google Fit, Garmin, Fitbit |
| **Phase 4: Hike Simulation** | 3 weeks | Database, API, mobile UI, achievements |
| **Phase 5: UX/UI Polish** | 2 weeks | Design system, dark mode, animations |
| **Phase 6: Infrastructure** | 1 week | Deployment, monitoring, optimization |
| **Phase 7: Beta Testing** | 3 weeks | Testing, feedback, fixes |
| **Buffer for unexpected issues** | 2 weeks | Always plan for unknowns |
| ****TOTAL**** | **21 weeks** | **~5 months** |

### Aggressive Estimate (Full-time work, ~40 hours/week)

| Phase | Duration |
|-------|----------|
| Phase 1-7 combined | **8-10 weeks** |

**Recommendation:** Start with MVP for beta (Phases 1-4), get feedback, then polish (Phases 5-7)

---

## Phased Rollout Strategy

### MVP Beta (Launch in 6-8 weeks)

**Include:**
- Email + Google OAuth (skip Apple for now)
- Mobile apps (iOS + Android)
- Apple Health integration only (most US users have iPhones)
- Hike simulation (basic version)
- Web dashboard

**Skip for now:**
- Garmin, Fitbit (add in v2 based on demand)
- Advanced achievements (start with basic completion badges)
- Dark mode (add in v2)
- Social features

### Version 1.0 (After beta feedback)

**Add:**
- Apple Sign In
- Google Fit integration
- Advanced achievements
- Dark mode
- UI polish based on feedback

### Version 2.0 (3-6 months after launch)

**Add:**
- Garmin & Fitbit integration
- Social features (share simulations, leaderboards)
- Guided audio workouts
- Offline mode for mobile
- Apple Watch complications
- Training plan marketplace (users share plans)

---

## Key Decisions to Make

### 1. Mobile Tech Stack

**Option A: Expo (React Native)**
- ✅ Reuse React knowledge
- ✅ Single codebase for iOS & Android
- ✅ Great wearable integration libraries
- ❌ Larger app size than native
- **Recommendation:** Choose this

**Option B: Native (Swift + Kotlin)**
- ✅ Best performance
- ✅ Smallest app size
- ❌ Two separate codebases
- ❌ Slower development
- **Recommendation:** Only if you have native experience

**Option C: PWA (Progressive Web App)**
- ✅ No app store approval
- ✅ Instant updates
- ❌ Limited wearable access
- ❌ No Apple Watch integration
- **Recommendation:** Good for web, bad for wearables

### 2. Wearable Priority

**Start with:** Apple Health (HealthKit)
**Add next:** Google Fit
**Later:** Garmin, Fitbit (if users request)

**Reason:** Most US users have iPhones, India is growing iPhone market.
Garmin/Fitbit are more complex OAuth flows and smaller user base.

### 3. Monetization Strategy

**Option A: Free forever**
- Build user base first
- Add premium features later

**Option B: Freemium from start**
- Free: 1 training plan/month, basic simulation
- Premium ($4.99/month): Unlimited plans, advanced analytics, wearable sync

**Recommendation:** Start free, add premium after 6 months with strong user base

---

## Next Steps (This Week)

1. **Set up OAuth providers**
   - Register Google OAuth app
   - Add Google provider to NextAuth
   - Test login flow

2. **Create Expo project**
   - Initialize new Expo app
   - Set up navigation
   - Create basic screens

3. **Plan database schema changes**
   - Review wearable integration models
   - Review simulation models
   - Run Prisma migration

4. **Register developer accounts**
   - Apple Developer ($99)
   - Google Play Developer ($25)

5. **Set up staging environment**
   - Deploy Next.js app to Vercel staging
   - Set up staging database
   - Test production-like environment

---

## Resources & Documentation

### Developer Accounts
- Apple Developer: https://developer.apple.com/
- Google Play Console: https://play.google.com/console
- Expo: https://expo.dev/
- Vercel: https://vercel.com/

### Wearable APIs
- Apple HealthKit: https://developer.apple.com/health-fitness/
- Google Fit: https://developers.google.com/fit
- Garmin Health: https://developer.garmin.com/health-api/overview/
- Fitbit Web API: https://dev.fitbit.com/build/reference/web-api/

### Libraries
- NextAuth.js: https://next-auth.js.org/
- Expo: https://docs.expo.dev/
- Prisma: https://www.prisma.io/docs
- React Native Health: https://github.com/agencyenterprise/react-native-health

### Design Resources
- React Native UI Kitten: https://akveo.github.io/react-native-ui-kitten/
- Expo Icons: https://icons.expo.fyi/
- Lottie Animations: https://lottiefiles.com/

---

## Success Metrics

### Beta Success Criteria
- 20+ active beta testers
- 50+ training plans generated
- 10+ hike simulations completed
- < 5% crash rate
- 4+ star average rating from testers

### Launch Success Criteria (3 months)
- 100+ active users
- 500+ training plans generated
- 50+ hike simulations completed
- 70%+ wearable connection rate
- 4.5+ star rating on app stores

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Apple/Google app rejection | Medium | High | Follow guidelines strictly, test thoroughly |
| HealthKit data privacy issues | Low | High | Clear privacy policy, minimal data collection |
| Wearable API rate limits | Medium | Medium | Cache data, implement retry logic |
| Database costs exceed budget | Low | Medium | Monitor usage, optimize queries |
| Low user adoption | Medium | High | Beta test thoroughly, iterate on feedback |
| AI API costs spike | Low | Medium | Set usage limits, cache responses |

---

## Conclusion

This roadmap provides a complete path to production for HikeSim. The key is to:

1. **Start with MVP:** Authentication + Mobile Apps + Apple Health + Basic Simulation
2. **Beta test with friends:** Get real feedback from 20-30 users
3. **Iterate quickly:** Fix bugs and add features based on feedback
4. **Launch publicly:** App Store, Google Play, and web
5. **Scale gradually:** Add Garmin, Fitbit, advanced features based on demand

**Total Time to Beta:** 6-8 weeks part-time, 4-6 weeks full-time
**Total Cost:** $136 setup + $5-50/month operating

You already have a solid foundation (40% complete). The mobile apps and wearable integration are the biggest remaining pieces. With focused effort, you can have a beta-ready app in 2 months.

**Ready to start? Let me know which phase you'd like to tackle first!** 🚀
