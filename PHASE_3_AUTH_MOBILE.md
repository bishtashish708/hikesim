# Phase 3: Mobile Authentication - Implementation Plan

## Overview

Add authentication to the mobile app with Google OAuth and email/password login, matching the web app's authentication system.

---

## Goals

1. **Authentication Screens**
   - Login screen with email/password
   - Signup screen with email/password
   - Google OAuth integration
   - Welcome/onboarding screen

2. **Session Management**
   - Secure token storage with expo-secure-store
   - Auto-login on app launch
   - Session persistence
   - Logout functionality

3. **Auth Context**
   - React Context for auth state
   - User profile data
   - Protected routes
   - Auth state synchronization

4. **Integration**
   - Connect to existing backend auth endpoints
   - Share authentication with web app
   - Profile data fetching
   - Real user data in Profile screen

---

## Implementation Steps

### Step 1: Install Authentication Dependencies

```bash
cd hikesim-mobile

# Auth and storage
npx expo install expo-auth-session expo-web-browser expo-secure-store

# Crypto for session handling
npx expo install expo-crypto
```

### Step 2: Create Auth Context

**File: `contexts/AuthContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        // Fetch user profile
        const response = await authApi.getProfile();
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    await SecureStore.setItemAsync('authToken', response.data.token);
    setUser(response.data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await authApi.signup({ name, email, password });
    await SecureStore.setItemAsync('authToken', response.data.token);
    setUser(response.data.user);
  };

  const loginWithGoogle = async () => {
    // Implement Google OAuth flow
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Step 3: Update API Client with Token

**Update: `services/api.ts`**

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-production-url.vercel.app/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (logout on unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('authToken');
      // Redirect to login
    }
    return Promise.reject(error);
  }
);

// Add auth endpoints
export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  signup: (data: { name?: string; email: string; password: string }) =>
    apiClient.post('/auth/signup', data),
  googleAuth: (token: string) =>
    apiClient.post('/auth/google', { token }),
  getProfile: () =>
    apiClient.get('/auth/profile'),
  logout: () =>
    apiClient.post('/auth/logout'),
};

// ... existing code
```

### Step 4: Create Login Screen

**File: `app/auth/login.tsx`**

```typescript
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Google sign-in failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue training</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Ionicons name="logo-google" size={20} color="#0f172a" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#94a3b8',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#64748b',
  },
  signupLink: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
});
```

### Step 5: Create Signup Screen

Similar to login screen but with name field and signup logic.

### Step 6: Add Google OAuth

```typescript
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
});

useEffect(() => {
  if (response?.type === 'success') {
    // Send token to backend
    authApi.googleAuth(response.authentication.accessToken);
  }
}, [response]);
```

### Step 7: Protect Routes

**Update: `app/_layout.tsx`**

```typescript
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useSegments, useRouter } from 'expo-router';

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return <Stack>...</Stack>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </AuthProvider>
  );
}
```

### Step 8: Update Profile Screen

Use real user data from auth context instead of placeholder.

---

## Backend Requirements

### Required API Endpoints

1. **POST /api/auth/login**
   - Body: `{ email, password }`
   - Returns: `{ token, user }`

2. **POST /api/auth/signup**
   - Body: `{ name, email, password }`
   - Returns: `{ token, user }`

3. **POST /api/auth/google**
   - Body: `{ token }` (Google access token)
   - Returns: `{ token, user }`

4. **GET /api/auth/profile**
   - Headers: `Authorization: Bearer <token>`
   - Returns: `{ user }`

5. **POST /api/auth/logout**
   - Headers: `Authorization: Bearer <token>`
   - Returns: `{ success: true }`

### JWT Token Format

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "isAdmin": false,
  "exp": 1234567890
}
```

---

## File Structure

```
hikesim-mobile/
├── app/
│   ├── _layout.tsx           # Updated with AuthProvider
│   ├── auth/
│   │   ├── login.tsx         # NEW - Login screen
│   │   └── signup.tsx        # NEW - Signup screen
│   └── (tabs)/
│       ├── index.tsx         # Updated with real user data
│       └── profile.tsx       # Updated with real user data
│
├── contexts/
│   └── AuthContext.tsx       # NEW - Auth state management
│
├── services/
│   └── api.ts                # Updated with auth endpoints
│
└── package.json              # Updated dependencies
```

---

## Testing Checklist

### Authentication Flow
- [ ] Login with email/password
- [ ] Signup with email/password
- [ ] Login with Google OAuth
- [ ] Token stored securely
- [ ] Auto-login on app restart
- [ ] Logout clears token
- [ ] Profile screen shows real user data

### Route Protection
- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users can access all tabs
- [ ] Login redirects to dashboard
- [ ] Logout redirects to login

### Error Handling
- [ ] Invalid credentials show error
- [ ] Network errors handled gracefully
- [ ] 401 errors trigger logout
- [ ] Form validation works

---

## Timeline

**Estimated: 1-2 days**

- Install dependencies: 10 minutes
- Auth context: 1 hour
- Login/Signup screens: 2 hours
- Google OAuth: 1 hour
- Route protection: 1 hour
- Update existing screens: 1 hour
- Testing and fixes: 2 hours

---

## Next Steps After Phase 3

Once authentication is complete, we can proceed to:

**Phase 4: Wearable Integration**
- Apple Health / HealthKit
- Google Fit
- Garmin Connect API
- Fitbit API

**Phase 5: Hike Simulation**
- Treadmill mode
- Outdoor tracking
- Multi-day progress
- Achievement system

---

## Notes

- Use expo-secure-store for token storage (encrypted on device)
- Google OAuth requires Google Cloud Console setup
- Backend already has auth endpoints from Phase 1
- Token format matches web app (JWT)
- Consider adding biometric auth (Face ID/Touch ID) later

---

**Ready to implement Phase 3?** This will enable users to:
1. Sign in to the mobile app
2. See their real training plans
3. Access their profile data
4. Sync with the web app

Let me know when you're ready to start!
