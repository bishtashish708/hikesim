# HikeSim Mobile - Quick Start

## 🎉 Mobile App Created!

Your mobile app is now running!

---

## How to View the App

The Expo development server is starting. You'll see a QR code in your terminal.

### Option 1: iOS Simulator (Mac only)

Press `i` in the terminal to open iOS Simulator

### Option 2: Android Emulator

Press `a` in the terminal to open Android Emulator

### Option 3: Physical Device (Recommended for testing)

1. **Install Expo Go:**
   - iOS: Download from App Store
   - Android: Download from Play Store

2. **Scan QR Code:**
   - iOS: Use Camera app to scan QR code
   - Android: Use Expo Go app to scan QR code

---

## Test API Connection

Once the app opens:

1. You'll see "🏔️ HikeSim Mobile" title
2. Click **"Test API Connection"** button
3. If connected, you'll see countries list
4. If not connected, check that:
   - Backend is running: `npm run dev` (in main project)
   - URL in `services/api.ts` is correct

---

## Testing on Physical Device?

If testing on your phone, you need to update the API URL:

1. Find your computer's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # Example output: inet 192.168.1.225
   ```

2. Edit `services/api.ts`:
   ```typescript
   const API_BASE_URL = __DEV__
     ? 'http://192.168.1.225:3000/api'  // Use your IP!
     : 'https://your-production-url.vercel.app/api';
   ```

3. Make sure your phone and computer are on the same WiFi network

---

## What's Working

- ✅ Expo app created with TypeScript
- ✅ API client configured
- ✅ Test screen to verify backend connection
- ✅ Development server running

## What's Next

### Immediate Next Steps:
1. Test the API connection button
2. Verify you can see countries from your backend
3. Start building real screens!

### Build the App Screens:
1. **Auth Screen** - Login/Signup
2. **Dashboard** - User's training plans
3. **Hikes List** - Browse all hikes
4. **Hike Detail** - Individual hike view
5. **Plan Generator** - Create training plans
6. **Profile** - User settings

---

## Useful Commands

```bash
# Start dev server
npx expo start

# Start with cache cleared
npx expo start --clear

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Stop the server
# Press Ctrl+C in terminal
```

---

## Keyboard Shortcuts in Expo

When the dev server is running:

- `i` - Open iOS Simulator
- `a` - Open Android Emulator
- `w` - Open in web browser
- `r` - Reload app
- `m` - Toggle menu
- `j` - Open debugger
- `c` - Clear cache

---

## Troubleshooting

### "Cannot connect to Metro"
- Ensure phone and computer are on same WiFi
- Update API_BASE_URL with your computer's IP

### "Network request failed"
- Check backend is running (`npm run dev`)
- Verify API URL is correct
- Check firewall isn't blocking port 3000

### "Module not found"
- Clear cache: `npx expo start --clear`
- Reinstall: `rm -rf node_modules && npm install`

---

## Project Structure

```
hikesim-mobile/
├── App.tsx              # Main app entry (test screen)
├── services/
│   └── api.ts          # API client (connects to backend)
├── package.json        # Dependencies
└── app.json            # Expo configuration
```

---

## Current Status

**Phase 2: Mobile Apps** - IN PROGRESS

✅ Step 1: Create Expo project
✅ Step 2: Install dependencies
✅ Step 3: Configure API client
✅ Step 4: Create test screen
✅ Step 5: Start development server

🔄 Next: Build actual app screens

---

**The mobile app is ready to test! Press 'i' for iOS or 'a' for Android in your terminal.** 🚀
