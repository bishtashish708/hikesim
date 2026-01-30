# Simple Beta Testing Without App Stores

## Option 1: Expo Go (Easiest - No Build Required)

Your friends can test the app RIGHT NOW using Expo Go.

### Setup
```bash
cd hikesim-mobile
npx expo start
```

### Share with Friends
1. Friends install **Expo Go** from App Store / Play Store
2. Share the QR code or the `exp://` link
3. They scan/open and the app loads instantly

**Pros:** Instant, free, no builds needed
**Cons:** Requires Expo Go app, not a "real" app install

---

## Option 2: EAS Internal Distribution (Best for Real Testing)

Build real apps and share via download links - no store publishing needed.

### One-Time Setup
```bash
npm install -g eas-cli
eas login
cd hikesim-mobile
eas init
```

### Build & Share Android APK
```bash
# Build APK (free, ~15 min)
eas build --platform android --profile preview

# After build completes, you get a download link like:
# https://expo.dev/artifacts/eas/xxxxx.apk
```

Share that link! Friends just:
1. Open link on Android phone
2. Download APK
3. Install (may need to enable "Install from unknown sources")

### Build & Share iOS (Requires Apple Developer $99/yr)
```bash
eas build --platform ios --profile preview
```

For iOS without Apple Developer account, friends must:
1. Give you their device UDID
2. You register their devices
3. Rebuild with their devices included

---

## Option 3: Direct APK Sharing (Android Only - Completely Free)

### Build Locally
```bash
cd hikesim-mobile

# Install dependencies
npx expo install expo-dev-client

# Build APK locally (requires Android Studio)
npx expo run:android --variant release
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Share via:
- Google Drive / Dropbox link
- WhatsApp / Telegram
- Email attachment
- AirDrop (to Android users nearby)

---

## Option 4: Firebase App Distribution (Free)

Google's free tool for distributing test builds.

### Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → App Distribution
3. Upload your APK/IPA
4. Add tester emails
5. Testers get email with download link

**Pros:** Free, works for both platforms, tracks installs
**Cons:** Requires Firebase account, iOS still needs Apple Developer

---

## Option 5: Diawi (Quick & Simple)

Upload your build file and get a shareable link.

1. Go to [diawi.com](https://diawi.com)
2. Upload your `.apk` or `.ipa` file
3. Get a download link
4. Share with friends

**Pros:** Super simple, no account needed
**Cons:** Links expire, iOS needs provisioning

---

## Quick Comparison

| Method | Cost | Android | iOS | Ease |
|--------|------|---------|-----|------|
| Expo Go | Free | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| EAS Preview | Free | ✅ | $99/yr | ⭐⭐⭐⭐ |
| Direct APK | Free | ✅ | ❌ | ⭐⭐⭐ |
| Firebase | Free | ✅ | $99/yr | ⭐⭐⭐ |
| Diawi | Free | ✅ | $99/yr | ⭐⭐⭐⭐ |

---

## Recommended: Start with Expo Go

### Right Now (2 minutes)
```bash
cd hikesim-mobile
npx expo start
```

Then press `s` to switch to Expo Go mode if needed.

Share with friends:
1. **QR Code** - They scan with Expo Go app
2. **Link** - Send them the `exp://192.168.x.x:8081` link

### When Ready for "Real" App Feel
```bash
# Build Android APK (free)
eas build --platform android --profile preview

# Share the download link from EAS dashboard
```

---

## Deploy Your API First!

Before friends can test, deploy your backend:

### Quick Deploy to Vercel (Free)
```bash
# In main project folder
npm install -g vercel
vercel

# Follow prompts, then set environment variables in Vercel dashboard
```

Then update `hikesim-mobile/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:3000/api'
  : 'https://your-app.vercel.app/api';
```

---

## TL;DR - Fastest Path

1. **Deploy API to Vercel** (free, 5 min)
2. **Share Expo Go link** with friends (instant)
3. **When ready**, build APK with `eas build --platform android --profile preview`
4. **Share download link** from EAS

No App Store. No $99. No waiting for approvals.
