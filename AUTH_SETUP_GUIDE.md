# Authentication Setup Guide

This guide covers setting up authentication for HikeSim, including Google OAuth and admin login.

## What's New in Phase 1

- **Google Sign-In**: Users can now sign up/sign in with their Google account
- **Admin Login**: Owner can bypass rate limiting with admin credentials
- **Admin Flag**: Database tracks admin users with `isAdmin` field

---

## Quick Start

### 1. Update Environment Variables

Copy `.env.example` to `.env` and update the following variables:

```bash
# Required for admin login
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=YourSecurePassword123

# Optional - for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
```

### 2. Admin Login

The admin login allows you (the owner) to:
- Bypass rate limiting (no 5 attempts/15min limit)
- Auto-create admin account on first login
- Access admin features (future: user management, analytics)

**How it works:**
1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
2. Go to the login page
3. Enter your admin email and password
4. Admin account is automatically created with `isAdmin: true`

**Security Notes:**
- Admin credentials are checked BEFORE rate limiting
- Admin password is hashed just like regular users
- Use a strong password (different from your personal accounts)
- Never commit `.env` file to git

---

## Google OAuth Setup

Follow these steps to enable "Sign in with Google":

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Name it "HikeSim" or similar

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in application details:
   - App name: `HikeSim`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. Save and continue

### Step 3: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `HikeSim Web`
5. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 4: Add to Environment Variables

Add to your `.env` file:

```bash
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789
```

### Step 5: Test

1. Restart your dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click "Continue with Google" button
4. Sign in with your Google account
5. You should be redirected to `/welcome`

---

## How Authentication Works

### Email/Password Flow

1. User enters email and password
2. Backend checks credentials against database
3. Password is hashed with bcrypt (10 rounds)
4. JWT token is generated (NextAuth)
5. User is redirected to dashboard

### Google OAuth Flow

1. User clicks "Continue with Google"
2. Redirected to Google login page
3. Google authenticates user
4. Google redirects back with authorization code
5. Backend exchanges code for user info (email, name, profile pic)
6. If user exists: Log them in
7. If new user: Create account with Google info
8. User is redirected to `/welcome`

### Admin Login Flow

1. User enters admin email and password
2. Checked BEFORE rate limiting
3. If admin credentials match ENV variables:
   - Check if admin user exists in database
   - If not, create with `isAdmin: true`
   - Bypass all rate limiting
4. Admin is logged in immediately

---

## Database Schema

The `User` model now includes:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?   // Profile picture (from Google)
  passwordHash  String?   // Only for email/password users
  isAdmin       Boolean   @default(false) // NEW!
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[] // OAuth accounts (Google, etc.)
  sessions      Session[]
  // ... other relations
}
```

**Key points:**
- `passwordHash` is optional (Google users don't have password)
- `emailVerified` is auto-set for Google users
- `isAdmin` defaults to `false` for all users
- `accounts` table links OAuth providers to users

---

## Session Data

The NextAuth session now includes:

```typescript
session.user.id        // User ID (cuid)
session.user.email     // User email
session.user.name      // User name
session.user.image     // Profile picture URL
session.user.isAdmin   // Admin flag (NEW!)
```

**Usage in components:**

```tsx
import { useSession } from 'next-auth/react';

export default function MyComponent() {
  const { data: session } = useSession();

  if (session?.user.isAdmin) {
    return <AdminDashboard />;
  }

  return <RegularDashboard />;
}
```

**Usage in API routes:**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (session.user.isAdmin) {
    // Admin-only logic
  }

  // Regular logic
}
```

---

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` to git
- Use different values for dev and production
- Rotate secrets periodically
- Use strong passwords (20+ characters, random)

### 2. Admin Password

- Use a password manager
- Don't reuse passwords
- Don't share admin credentials
- Consider 2FA for production (future feature)

### 3. OAuth Redirect URIs

- Only whitelist your actual domains
- Don't use wildcards in production
- Test redirect URIs in development first

### 4. Rate Limiting

- Currently: 5 attempts per 15 minutes
- Applies to email/password login only
- Admin login bypasses rate limiting
- Consider adding IP-based blocking for production

---

## Troubleshooting

### Google Sign-In Not Working

**Error:** "redirect_uri_mismatch"
- **Fix:** Ensure redirect URI in Google Console matches exactly
- Dev: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://yourdomain.com/api/auth/callback/google`

**Error:** "Access blocked: This app's request is invalid"
- **Fix:** Configure OAuth consent screen first
- Add required scopes (email, profile)
- Verify app is not in testing mode (or add your email to test users)

### Admin Login Not Working

**Issue:** "Invalid email or password"
- **Fix:** Check `.env` file has correct `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Restart dev server after changing `.env`
- Email must match exactly (case-insensitive)

**Issue:** Admin flag not set
- **Fix:** Delete user from database, login again to auto-create
- Or manually update: `UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';`

### Session Not Persisting

**Issue:** Logged out after page refresh
- **Fix:** Ensure `NEXTAUTH_SECRET` is set in `.env`
- Generate: `openssl rand -base64 32`
- Restart dev server

---

## Production Deployment

### Vercel

1. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your domain)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `GOOGLE_CLIENT_ID` (optional)
   - `GOOGLE_CLIENT_SECRET` (optional)

2. Update Google OAuth redirect URIs:
   - Add production URL: `https://yourdomain.com/api/auth/callback/google`

3. Run database migration:
   ```bash
   npx prisma migrate deploy
   ```

### Other Platforms

- Ensure all environment variables are set
- Update `NEXTAUTH_URL` to your production domain
- Update OAuth redirect URIs for all providers
- Use HTTPS in production (required for OAuth)

---

## Next Steps (Future Features)

- [ ] Apple Sign In
- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] User management dashboard (admin)
- [ ] Activity logs (admin)

---

## Support

For issues or questions:
1. Check this guide first
2. Review NextAuth docs: https://next-auth.js.org/
3. Review Google OAuth docs: https://developers.google.com/identity/protocols/oauth2

---

**Last Updated:** 2026-01-25
**Version:** Phase 1 - Authentication & Security
