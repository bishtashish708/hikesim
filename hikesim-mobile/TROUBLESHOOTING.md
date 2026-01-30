# HikeSim Mobile - Troubleshooting Guide

## Common Issues and Solutions

### 1. Missing Dependencies Error

**Error:**
```
Unable to resolve module react-native-safe-area-context
```

**Solution:**
```bash
npx expo install react-native-safe-area-context @react-navigation/native react-native-screens react-native-gesture-handler -- --legacy-peer-deps
```

### 2. Babel Preset Error

**Error:**
```
Cannot find module 'babel-preset-expo'
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 3. Port Already in Use

**Error:**
```
Port 8081 is running this app in another window
```

**Solution:**
```bash
lsof -ti:8081 | xargs kill -9
npx expo start
```

### 4. Cannot Find App.tsx

**Error:**
```
Unable to resolve module ./App from index.ts
```

**Solution:**
Remove old index.ts file (not needed with Expo Router):
```bash
rm index.ts
```

Update package.json:
```json
{
  "main": "expo-router/entry"
}
```

### 5. Network Request Failed (Physical Device)

**Issue:** App can't connect to backend on physical device

**Solution:**
1. Find your computer's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `services/api.ts`:
   ```typescript
   const API_BASE_URL = __DEV__
     ? 'http://YOUR_IP_ADDRESS:3000/api'  // e.g., 192.168.1.225
     : 'https://your-production-url.vercel.app/api';
   ```

3. Ensure phone and computer are on same WiFi network

### 6. Metro Bundler Slow

**Issue:** Takes too long to bundle

**Solution:**
```bash
# Clear cache and restart
npx expo start --clear

# Or reset everything
rm -rf node_modules .expo
npm install --legacy-peer-deps
npx expo start
```

### 7. iOS Simulator Not Opening

**Error:**
```
Unable to run simctl
```

**Solution:**
- Xcode must be installed (Mac only)
- Open Xcode once to accept license
- Run: `sudo xcode-select --switch /Applications/Xcode.app`

### 8. TypeScript Errors

**Error:**
```
Cannot find module '@/services/api'
```

**Solution:**
Check `tsconfig.json` has path mapping:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Check `babel.config.js` has module resolver:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
    ],
  };
};
```

## Fresh Start

If nothing works, completely reset the project:

```bash
cd /Users/ashishbisht/Desktop/Test_Project/hikesim-mobile

# Remove everything
rm -rf node_modules .expo package-lock.json

# Reinstall
npm install --legacy-peer-deps
npx expo install react-native-safe-area-context @react-navigation/native react-native-screens react-native-gesture-handler -- --legacy-peer-deps

# Start fresh
npx expo start --clear
```

## Getting Help

1. Check Expo logs in terminal
2. Check Metro bundler output
3. Look for red error screens in app
4. Check browser console (if using web)

## Useful Commands

```bash
# Start normally
npx expo start

# Clear cache
npx expo start --clear

# Web only
npx expo start --web

# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Check what's on port 8081
lsof -i:8081

# View running Expo processes
ps aux | grep expo
```

## Dependencies List

Required packages for the app:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.20",
    "axios": "^1.13.3",
    "expo": "~54.0.32",
    "expo-router": "^6.0.22",
    "expo-auth-session": "^7.0.10",
    "expo-secure-store": "^15.0.8",
    "expo-web-browser": "^15.0.10",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-safe-area-context": "latest",
    "@react-navigation/native": "latest",
    "react-native-screens": "latest",
    "react-native-gesture-handler": "latest",
    "zustand": "^5.0.10"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "babel-plugin-module-resolver": "^5.0.2",
    "typescript": "~5.9.2"
  }
}
```

## Still Having Issues?

1. Check that backend is running: `npm run dev` (in main project)
2. Check that you're in the right directory: `/Users/ashishbisht/Desktop/Test_Project/hikesim-mobile`
3. Check Node.js version: `node --version` (should be 18+)
4. Check npm version: `npm --version`

---

**Last Updated:** 2026-01-26
