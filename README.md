## HikeSim

HikeSim is a hiking training platform that converts real trails into treadmill-ready training plans, tracks workouts, and gamifies hiking through virtual challenges and leaderboards.

## Features

### Web Application
- **Trail Database**: 3,500+ trails from US and India with elevation profiles
- **Training Plans**: AI-generated treadmill sessions with incline/speed segments
- **User Authentication**: Email/password and Google OAuth
- **Trail Images**: Auto-enriched trail photos via Unsplash

### Mobile App (Expo/React Native)
- **Browse Hikes**: Filter by region, difficulty, distance
- **Virtual Challenges**: Complete famous trails from anywhere
- **Workout Logging**: Manual entry + health platform sync
- **Leaderboards**: Weekly/monthly/all-time rankings
- **Badges & Achievements**: Streak, distance, and elevation milestones

### Gamification System
- **Streak Tracking**: 3 modes (Strict, Grace Period, Flexible)
- **Point Multipliers**: Up to 2x for 30-day streaks
- **18 Achievement Badges**: Streak, distance, elevation milestones
- **Global Leaderboards**: 6 ranking categories

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (or Neon serverless)
- OpenRouter API key (optional, for AI features)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Push database schema
npm run db:push

# Seed initial data
npm run db:seed

# Seed challenges and badges
npx tsx prisma/seed-challenges.ts

# Start development server
npm run dev
```

### Mobile App

```bash
cd hikesim-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android).

## Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production

# Database
npm run db:push          # Push schema changes
npm run db:seed          # Seed hikes and demo user
npx tsx prisma/seed-challenges.ts  # Seed challenges

# Trail Data
npm run trails:fetch     # Fetch fresh trail data
npx tsx scripts/enrich-hike-images.ts  # Enrich trail images

# Tests
npm run test
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/          # API routes
│   │   │   ├── auth/     # Authentication endpoints
│   │   │   ├── badges/   # Badge system
│   │   │   ├── challenges/ # Virtual challenges
│   │   │   ├── hikes/    # Trail data + enrichment
│   │   │   ├── leaderboard/ # Global rankings
│   │   │   └── workouts/ # Workout logging
│   │   └── (pages)/      # Web app pages
│   ├── components/       # React components
│   └── lib/              # Shared utilities
│       ├── auth.ts       # NextAuth config
│       ├── badgeService.ts # Badge awarding
│       ├── db.ts         # Prisma client
│       └── imageEnrichment.ts # Trail image search
├── hikesim-mobile/       # Expo React Native app
│   ├── app/              # Expo Router screens
│   │   ├── (tabs)/       # Tab navigation
│   │   ├── challenge/    # Challenge details
│   │   └── hike/         # Hike details
│   └── services/         # API client
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── seed.ts           # Hike seeding
│   └── seed-challenges.ts # Challenge seeding
└── scripts/
    └── enrich-hike-images.ts # Image enrichment script
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# AI Features (optional)
OPENROUTER_API_KEY="..."
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Mobile JWT login
- `GET /api/auth/profile` - Get user profile

### Hikes
- `GET /api/hikes/by-region` - List hikes with filters
- `GET /api/hikes/[id]` - Get hike details + images
- `POST /api/hikes/enrich-images` - Trigger image enrichment

### Challenges
- `GET /api/challenges` - List challenges
- `POST /api/challenges/[id]/join` - Join a challenge
- `POST /api/challenges/[id]/log-progress` - Log progress

### Leaderboard
- `GET /api/leaderboard` - Global rankings (type, timeFrame)

### Badges
- `GET /api/badges` - All available badges
- `GET /api/badges/my-badges` - User's earned badges

### Workouts
- `GET /api/workouts` - User's workout history
- `POST /api/workouts` - Log a workout

## Development Login

The seed script creates a demo user for local development. Check the seed file for credentials.

## License

Private - All rights reserved
