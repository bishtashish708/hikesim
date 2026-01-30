# HikeSim App Store Beta Testing Plan

## Overview
This guide walks you through publishing HikeSim to TestFlight for beta testing with friends.

**Timeline:** 2-3 days (mostly waiting for Apple approvals)
**Cost:** $99/year (Apple Developer Program)

---

## Phase 1: Prerequisites (Day 1)

### 1.1 Apple Developer Account
- [ ] Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/)
- [ ] Pay $99/year fee
- [ ] Wait for approval (usually 24-48 hours)
- [ ] Note your **Team ID** from the Membership page

### 1.2 Install Required Tools
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account (create one if needed)
eas login

# Install Xcode from Mac App Store (if not installed)
# Required for iOS builds
```

### 1.3 App Store Connect Setup
- [ ] Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] Create a new app:
  - Platform: iOS
  - Name: HikeSim
  - Primary Language: English
  - Bundle ID: com.yourname.hikesim (will create in next step)
  - SKU: hikesim-001

---

## Phase 2: Configure Expo Project (Day 1)

### 2.1 Update app.json
```bash
cd hikesim-mobile
```

Edit `app.json`:
```json
{
  "expo": {
    "name": "HikeSim",
    "slug": "hikesim",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#10b981"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.hikesim",
      "buildNumber": "1",
      "infoPlist": {
        "NSHealthShareUsageDescription": "HikeSim uses health data to track your hiking workouts and sync with challenges.",
        "NSHealthUpdateUsageDescription": "HikeSim writes workout data to track your hiking progress."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#10b981"
      },
      "package": "com.yourname.hikesim"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 2.2 Initialize EAS
```bash
cd hikesim-mobile
eas init
```

### 2.3 Create eas.json
```bash
eas build:configure
```

This creates `eas.json`. Update it:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

---

## Phase 3: Build & Submit (Day 2)

### 3.1 Create Production Build
```bash
cd hikesim-mobile

# Build for iOS (takes 15-30 minutes)
eas build --platform ios --profile production
```

During the build:
- EAS will ask about Apple credentials
- Choose "Log in with Apple Developer account"
- It will create necessary certificates and provisioning profiles

### 3.2 Submit to App Store Connect
```bash
# Submit the build to TestFlight
eas submit --platform ios --latest
```

Or submit a specific build:
```bash
eas submit --platform ios --id BUILD_ID
```

### 3.3 Alternative: Manual Upload
If EAS submit fails:
1. Download the `.ipa` file from EAS dashboard
2. Open **Transporter** app (free on Mac App Store)
3. Drag and drop the `.ipa` file
4. Click "Deliver"

---

## Phase 4: TestFlight Setup (Day 2-3)

### 4.1 Complete App Information
In App Store Connect:

**App Information:**
- [ ] Privacy Policy URL (required): Create one at [getterms.io](https://getterms.io) or use Notion
- [ ] Category: Health & Fitness
- [ ] Age Rating: 4+

**TestFlight Tab:**
- [ ] Add Test Information
  - Beta App Description: "HikeSim helps you train for real hikes using treadmill workouts"
  - Feedback Email: your@email.com

### 4.2 Add Beta Testers

**Internal Testers** (up to 100, instant access):
- Go to TestFlight > Internal Testing
- Add testers by Apple ID email
- They get access immediately after build processes

**External Testers** (up to 10,000, requires review):
- Go to TestFlight > External Testing
- Create a group (e.g., "Friends & Family")
- Add testers by email (don't need Apple ID)
- Submit for Beta App Review (usually 24-48 hours)

### 4.3 Invite Friends
Once approved, testers receive an email with:
1. Download TestFlight app from App Store
2. Click invitation link or enter redemption code
3. Install HikeSim beta

---

## Phase 5: Environment Setup

### 5.1 Production API Server
Your friends need to connect to your API. Options:

**Option A: Deploy to Vercel (Recommended)**
```bash
# In main project directory
npm install -g vercel
vercel

# Set environment variables in Vercel dashboard
```

**Option B: Use ngrok for testing**
```bash
# Expose local server
ngrok http 3000

# Update hikesim-mobile/services/api.ts with ngrok URL
```

### 5.2 Update API URL for Production
Edit `hikesim-mobile/services/api.ts`:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.225:3000/api'  // Local development
  : 'https://hikesim.vercel.app/api'; // Production
```

---

## Quick Commands Reference

```bash
# === EAS Build Commands ===
eas build --platform ios                    # Production build
eas build --platform ios --profile preview  # Internal testing build
eas build --platform all                    # iOS + Android

# === Submit Commands ===
eas submit --platform ios --latest          # Submit latest build
eas submit --platform ios --id BUILD_ID     # Submit specific build

# === Useful Commands ===
eas build:list                              # List all builds
eas credentials                             # Manage certificates
eas device:list                             # List registered devices
eas whoami                                  # Check logged in account

# === Local Testing ===
npx expo run:ios                            # Run on simulator
npx expo run:ios --device                   # Run on connected device
```

---

## Checklist Summary

### Before First Build
- [ ] Apple Developer Program enrolled ($99/year)
- [ ] App created in App Store Connect
- [ ] `app.json` configured with bundle ID
- [ ] `eas.json` configured
- [ ] EAS CLI installed and logged in
- [ ] Privacy Policy URL ready

### Before TestFlight Distribution
- [ ] Build successfully uploaded
- [ ] Test Information filled in App Store Connect
- [ ] Internal testers added (instant access)
- [ ] External testers added (requires review)
- [ ] Production API deployed (Vercel)

### Share with Friends
- [ ] Send TestFlight invitation emails
- [ ] Share TestFlight public link (if enabled)
- [ ] Create feedback channel (Discord/Slack/email)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build --platform ios --clear-cache
```

### Credentials Issues
```bash
# Reset credentials
eas credentials --platform ios
```

### App Rejected from TestFlight
Common reasons:
- Missing privacy policy
- Incomplete metadata
- Placeholder content
- Crashes on launch (test locally first!)

### API Connection Issues
- Ensure production API is deployed
- Check API_BASE_URL in api.ts
- Verify environment variables in Vercel

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| EAS Build (free tier) | $0 | 30 builds/month |
| Vercel Hosting | $0 | Hobby tier |
| **Total** | **$99** | **First year** |

---

## Next Steps After Beta

1. Collect feedback from testers
2. Fix bugs and improve UX
3. Add App Store screenshots (6.5" and 5.5")
4. Write App Store description
5. Submit for App Store Review
6. Launch publicly!
