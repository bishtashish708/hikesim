# Phase 2: Mobile Apps - Setup Guide

## Overview

We'll build native iOS and Android apps using **Expo (React Native)** that share the same backend as your web app.

**Why Expo?**
- Single codebase for iOS + Android
- Your React/TypeScript skills transfer directly
- Built-in support for Apple Health, Google Fit
- Easier deployment (EAS Build)
- Hot reloading during development

---

## Prerequisites

### 1. Install Required Software

**Node.js** (already installed ✓)

**Expo CLI:**
```bash
npm install -g expo-cli eas-cli
```

**For iOS Development:**
- macOS required
- Xcode 14+ (from App Store)
- iOS Simulator (comes with Xcode)

**For Android Development:**
- Android Studio (any OS)
- Android Emulator setup

**For Testing on Physical Devices:**
- Install "Expo Go" app from App Store (iOS) or Play Store (Android)

### 2. Create Expo Account

```bash
npx expo login
```

Or sign up at: https://expo.dev/signup

---

## Step 1: Create Mobile App Project

### Create New Expo App

```bash
# Navigate to your project root
cd /Users/ashishbisht/Desktop/Test_Project

# Create mobile app in separate directory
npx create-expo-app hikesim-mobile --template tabs

# Navigate into mobile project
cd hikesim-mobile
```

### Project Structure

```
hikesim-mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── hikes.tsx      # Browse hikes
│   │   ├── training.tsx   # Training plans
│   │   └── profile.tsx    # User profile
│   ├── hike/[id].tsx      # Hike detail
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 page
├── components/            # Reusable components
├── constants/            # Colors, theme, config
├── hooks/                # Custom hooks
└── assets/               # Images, fonts
```

---

## Step 2: Install Dependencies

```bash
cd hikesim-mobile

# Core dependencies
npx expo install expo-router expo-auth-session expo-web-browser

# API & State Management
npm install axios @tanstack/react-query zustand

# UI Components (optional)
npm install react-native-paper

# For later: Health integrations
npx expo install expo-health-connect
npm install react-native-health
```

---

## Step 3: Configure API Client

### Create API Service

```typescript
// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-production-url.vercel.app/api'; // Production

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API endpoints
export const hikeApi = {
  getAll: (params?: any) => apiClient.get('/hikes/by-region', { params }),
  getById: (id: string) => apiClient.get(`/hikes/${id}`),
  getCountries: () => apiClient.get('/geo/countries'),
  getRegions: (country: string) => apiClient.get(`/geo/regions?country=${country}`),
};

export const trainingApi = {
  generateQuickPlan: (data: any) => apiClient.post('/ai/generate-quick-plan', data),
  generateAdvancedPlan: (data: any) => apiClient.post('/ai/generate-advanced-plan', data),
  getMyPlans: () => apiClient.get('/training-plans'),
  getPlanById: (id: string) => apiClient.get(`/training-plans/${id}`),
};

export const authApi = {
  signup: (data: any) => apiClient.post('/auth/signup', data),
  // Google OAuth will use expo-auth-session
};

export default apiClient;
```

---

## Step 4: Setup Authentication

### Google OAuth with Expo

```typescript
// services/auth.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      // Send to your backend
      fetch('http://localhost:3000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authentication?.accessToken }),
      }).then(async (res) => {
        const { token } = await res.json();
        await SecureStore.setItemAsync('authToken', token);
      });
    }
  }, [response]);

  return { request, promptAsync };
};
```

---

## Step 5: Create Basic Screens

### Dashboard Screen

```typescript
// app/(tabs)/index.tsx
import { View, Text, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { trainingApi } from '@/services/api';

export default function DashboardScreen() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['training-plans'],
    queryFn: () => trainingApi.getMyPlans(),
  });

  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
          Welcome to HikeSim
        </Text>

        {/* Active Training Plans */}
        <Text style={{ fontSize: 18, marginTop: 20 }}>
          Your Training Plans
        </Text>

        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          plans?.data.map((plan: any) => (
            <View key={plan.id} style={{ padding: 12, borderWidth: 1, marginTop: 8 }}>
              <Text>{plan.hikeName}</Text>
              <Text>{plan.fitnessLevel}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
```

### Hikes List Screen

```typescript
// app/(tabs)/hikes.tsx
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { hikeApi } from '@/services/api';

export default function HikesScreen() {
  const router = useRouter();
  const { data: hikes, isLoading } = useQuery({
    queryKey: ['hikes'],
    queryFn: () => hikeApi.getAll({ limit: 500 }),
  });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={hikes?.data?.hikes || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/hike/${item.id}`)}
            style={{ padding: 16, borderBottomWidth: 1 }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {item.name}
            </Text>
            <Text style={{ color: '#666' }}>
              {item.distanceMiles} mi • {item.elevationGainFt} ft
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

---

## Step 6: Run the App

### Start Development Server

```bash
cd hikesim-mobile
npx expo start
```

### Test on Device/Simulator

**iOS Simulator:**
- Press `i` in the terminal
- Or scan QR code with Camera app (requires Expo Go)

**Android Emulator:**
- Press `a` in the terminal
- Or scan QR code with Expo Go app

**Physical Device:**
- Install "Expo Go" from App Store / Play Store
- Scan QR code from terminal

---

## Step 7: Connect to Your Backend

### Update API Base URL

When testing on physical device, use your computer's IP address:

```typescript
// services/api.ts
const API_BASE_URL = __DEV__
  ? 'http://YOUR_COMPUTER_IP:3000/api'  // e.g., http://192.168.1.225:3000/api
  : 'https://your-production-url.vercel.app/api';
```

Find your IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

### Test API Connection

```typescript
// Test in any component
useEffect(() => {
  hikeApi.getCountries()
    .then(res => console.log('✅ API Connected:', res.data))
    .catch(err => console.error('❌ API Error:', err));
}, []);
```

---

## Step 8: Build for Production

### Configure EAS Build

```bash
# Initialize EAS
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile preview

# Build for Android
eas build --platform android --profile preview
```

### Submit to Stores

```bash
# Submit to App Store (after build completes)
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

---

## Project Timeline

### Week 1: Foundation
- ✅ Setup Expo project
- ✅ Configure API client
- ✅ Build basic screens (Dashboard, Hikes, Profile)
- ✅ Test on simulator/device

### Week 2: Features
- Implement authentication flow
- Add training plan generation
- Build hike detail screen
- Add navigation between screens

### Week 3: Polish
- Improve UI/UX
- Add loading states
- Error handling
- Offline support (React Query caching)

### Week 4: Testing & Deploy
- Test on physical devices
- Fix bugs
- Build production versions
- Submit to TestFlight / Play Beta

---

## Key Differences: Web vs Mobile

| Feature | Web (Next.js) | Mobile (Expo) |
|---------|---------------|---------------|
| **Routing** | Next.js App Router | Expo Router |
| **Auth** | NextAuth + cookies | expo-auth-session + SecureStore |
| **Storage** | Cookies / localStorage | SecureStore / AsyncStorage |
| **API Calls** | Server + client | Client-side only |
| **Styling** | Tailwind CSS | StyleSheet / inline styles |
| **Navigation** | Link component | useRouter hook |

---

## Shared Code Strategy

You can share TypeScript types and utility functions:

```
/Users/ashishbisht/Desktop/Test_Project/
├── src/                    # Web app (Next.js)
├── hikesim-mobile/         # Mobile app (Expo)
└── shared/                 # Shared code
    ├── types/             # TypeScript types
    │   ├── hike.ts
    │   ├── user.ts
    │   └── training-plan.ts
    ├── utils/             # Utility functions
    │   ├── validation.ts
    │   └── calculations.ts
    └── constants/         # Shared constants
        └── config.ts
```

Import from shared folder in both projects:
```typescript
import { Hike } from '../shared/types/hike';
```

---

## Next Steps After Phase 2

Once mobile apps are working:

1. **Phase 3:** Add wearable integration (Apple Health, Google Fit)
2. **Phase 4:** Build hike simulation feature
3. **Phase 5:** Polish UI/UX
4. **Beta Testing:** TestFlight + Play Store beta

---

## Resources

- **Expo Docs:** https://docs.expo.dev/
- **Expo Router:** https://expo.github.io/router/docs/
- **React Native:** https://reactnative.dev/
- **React Query:** https://tanstack.com/query/latest
- **EAS Build:** https://docs.expo.dev/build/introduction/

---

## Troubleshooting

### "Cannot connect to Metro"
- Make sure your phone and computer are on the same WiFi
- Use your computer's IP address in API_BASE_URL

### "Network request failed"
- Check API_BASE_URL is correct
- Ensure backend server is running (`npm run dev`)
- Check firewall isn't blocking port 3000

### "Module not found"
- Run `npx expo install` to install Expo-compatible versions
- Clear cache: `npx expo start --clear`

---

**Ready to start?** Run these commands to begin:

```bash
cd /Users/ashishbisht/Desktop/Test_Project
npx create-expo-app hikesim-mobile --template tabs
cd hikesim-mobile
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator!
