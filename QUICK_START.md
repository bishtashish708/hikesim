# 🚀 HikeSim Quick Start Guide

Get your HikeSim app running in under 5 minutes!

---

## ✅ Prerequisites

Before you start, make sure you have:
- **Node.js 18+** installed (`node --version`)
- **npm** or **pnpm** package manager
- **Neon PostgreSQL** account (free tier works great)
- **OpenRouter API key** (optional, for AI features - $5 free credits)

---

## 🏃 Fast Track (3 Steps)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or edit `.env` file with your credentials:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@xxx.neon.tech/neondb?sslmode=require"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenRouter.ai (for AI features - optional)
OPENROUTER_API_KEY="sk-or-v1-xxx"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_SITE_NAME="HikeSim"
```

### 3. Run Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start hiking! 🏔️

---

## 📊 What You Get

After setup, you'll have access to:

### User Features
- ✅ **Authentication** - Signup/signin with email & password
- ✅ **Dashboard** - Your personal training hub
- ✅ **64 Hikes** - Pre-loaded US & India trails
- ✅ **AI Quick Plans** - Generate plans in 5-10 seconds
- ✅ **Custom Plans** - 15-step wizard for full control
- ✅ **Plan Management** - View, track, and manage all your plans
- ✅ **Progress Tracking** - Visual progress bars and week tracking
- ✅ **Mobile Responsive** - Works great on phones

### Technical Features
- ✅ **Next.js 16** - React 19, App Router, Server Components
- ✅ **PostgreSQL** - Production-ready database (Neon)
- ✅ **AI Integration** - OpenRouter.ai with GPT-4o Mini
- ✅ **TypeScript** - Full type safety
- ✅ **Tailwind CSS** - Beautiful, responsive UI

---

## 🎯 User Journey

Here's what users can do:

```
1. Sign Up/Sign In
   ↓
2. Dashboard (your home)
   - See all your training plans
   - View upcoming workouts
   - Track progress
   ↓
3. Browse Hikes
   - 64 pre-loaded hikes
   - Search & filter
   - View elevation profiles
   ↓
4. Generate Training Plan (2 modes)

   Mode 1: Quick Plan (AI)
   - Answer 3 questions
   - AI generates in 5-10 seconds
   - Cost: ~$0.002 per plan

   Mode 2: Custom Plan
   - 15-step wizard
   - Full customization
   - 100% free
   ↓
5. View & Track Plans
   - Week-by-week breakdown
   - Daily workout details
   - Progress tracking
   - AI generation metadata
```

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npm run db:studio        # Open Prisma Studio (GUI)
npx prisma migrate dev   # Create new migration
npx prisma migrate deploy # Apply migrations
npx prisma db seed       # Seed database
npx prisma generate      # Regenerate Prisma client
```

### Trail Management
```bash
npm run trails:validate  # Check data quality
npm run trails:fetch     # Fetch from OSM (if available)
npm run trails:enrich    # Enrich existing hikes
```

---

## 🎨 Key Pages

After starting the app, explore these pages:

| Page | URL | Purpose |
|------|-----|---------|
| **Landing** | `/` | Auth landing page |
| **Dashboard** | `/dashboard` | Your training hub |
| **Hikes** | `/hikes` | Browse all hikes |
| **Hike Detail** | `/hikes/[id]` | View hike + generate plan |
| **My Plans** | `/training-plans` | All your plans |
| **Plan Detail** | `/training-plans/[id]` | Week-by-week breakdown |

---

## 🧪 Test the App

### Create Your First Plan (AI Mode)

1. Sign up at [http://localhost:3000](http://localhost:3000)
2. Navigate to Dashboard → Browse Hikes
3. Click any hike (e.g., "Angel's Landing")
4. Choose "Quick Plan (AI-Powered)"
5. Answer 3 questions:
   - Fitness level: Intermediate
   - Weeks until hike: 8
   - Training preference: Mixed
6. Click "Generate Plan"
7. Wait 5-10 seconds
8. View your AI-generated plan!

### Create Your First Plan (Custom Mode)

1. On hike detail page, choose "Custom Plan"
2. Go through 15-step wizard:
   - Set start date
   - Choose target date
   - Select training days
   - Configure baseline fitness
   - Customize workouts
3. Generate plan
4. View and track progress

---

## 💰 Cost Breakdown

### Development: $0
- Neon PostgreSQL: Free tier (up to 0.5 GB)
- OpenRouter.ai: $5 free credits
- All other tools: Open source

### Operating Costs (Per Month)

**For 100 users:**
- Database: $0 (free tier)
- AI plans: ~$0.40-0.80
- **Total: <$1/month**

**For 1,000 users:**
- Database: $0-5
- AI plans: ~$4-8
- **Total: ~$10/month**

**For 10,000 users:**
- Database: ~$20
- AI plans: ~$40-80
- **Total: ~$100/month**

---

## 📈 Current Progress

**Completed Steps (4/10):**
- ✅ Step 1: PostgreSQL Migration
- ✅ Step 2: Trail Data Enrichment
- ✅ Step 3: AI Integration (OpenRouter)
- ✅ Step 4: Enhanced UX with AI

**Remaining Steps:**
- ⏸️ Step 5: Onboarding flow
- ⏸️ Step 6: Plan adjustment UI
- ⏸️ Step 7: Workout detail page
- ⏸️ Step 8: Progress tracking
- ⏸️ Step 9: Analytics & polish
- ⏸️ Step 10: Production deployment

---

## 🔒 Security Setup

### Required (Already Implemented):
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ JWT sessions (NextAuth)
- ✅ Rate limiting on auth
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection (React)

### Recommended (Future):
- [ ] Email verification
- [ ] Password reset flow
- [ ] Two-factor authentication
- [ ] User quotas (AI usage limits)

---

## 📁 Project Structure

```
HikeSim/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/         # User dashboard ✨ NEW
│   │   ├── hikes/             # Hike browsing
│   │   ├── training-plans/    # Plan management ✨ NEW
│   │   └── api/               # API routes
│   │       ├── auth/          # NextAuth
│   │       ├── hikes/         # Hike CRUD
│   │       ├── trails/        # Trail search
│   │       └── ai/            # AI generation ✨ NEW
│   │
│   ├── components/            # React components
│   │   ├── QuickPlanGenerator.tsx ✨ NEW
│   │   ├── TrainingPlanBuilder.tsx
│   │   ├── AppHeader.tsx
│   │   └── ...
│   │
│   └── lib/                   # Business logic
│       ├── ai/                # AI services ✨ NEW
│       ├── trail-data/        # OSM & elevation
│       ├── training/          # Plan generation
│       ├── auth.ts            # NextAuth config
│       └── db.ts              # Prisma client
│
├── prisma/                    # Database
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/                   # CLI tools
└── docs/                      # Documentation
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check your DATABASE_URL in .env
# Make sure it starts with: postgresql://
# Verify Neon connection string is correct
```

### AI Generation Not Working
```bash
# Check OPENROUTER_API_KEY in .env
# Verify you have credits: https://openrouter.ai/credits
# Check API key starts with: sk-or-v1-
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Make sure Prisma client is generated
npx prisma generate

# Check TypeScript version
npm list typescript

# Restart your IDE/editor
```

---

## 📚 Documentation

For detailed information, see:

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Complete project overview
- [STEP_1_SUCCESS.md](./docs/STEP_1_SUCCESS.md) - PostgreSQL migration
- [STEP_2_SUCCESS.md](./docs/STEP_2_SUCCESS.md) - Trail enrichment
- [STEP_3_SUCCESS.md](./docs/STEP_3_SUCCESS.md) - AI integration
- [STEP_4_SUCCESS.md](./docs/STEP_4_SUCCESS.md) - UX enhancements
- [VERIFICATION_GUIDE.md](./docs/VERIFICATION_GUIDE.md) - Testing guide
- [AI_SETUP_GUIDE.md](./docs/AI_SETUP_GUIDE.md) - AI setup details

---

## 🎉 Success Checklist

After completing setup, verify:

- [ ] Dev server starts without errors
- [ ] Can sign up with email/password
- [ ] Dashboard page loads
- [ ] Can browse hikes
- [ ] Can view hike detail with elevation chart
- [ ] Can generate Quick Plan (AI) - if API key configured
- [ ] Can create Custom Plan
- [ ] Can view plan in "My Plans"
- [ ] Can see plan detail with week breakdown
- [ ] Progress bars display correctly
- [ ] Mobile view works (resize browser)

---

## 🚀 Next Steps

Now that you're set up:

1. **Explore the app** - Create a few training plans
2. **Test AI features** - Try Quick Plan generator
3. **Check the data** - View database in Prisma Studio (`npm run db:studio`)
4. **Read the docs** - Understand the architecture
5. **Start building** - Add your own features!

---

## 💡 Tips

- **AI costs are low**: ~$0.002 per plan generation
- **Database is free**: Neon free tier handles 100s of users
- **Mobile-first**: All pages work great on phones
- **Type-safe**: TypeScript catches errors before runtime
- **Server-rendered**: Fast initial page loads

---

## 🆘 Need Help?

- **Documentation**: Check `docs/` folder for detailed guides
- **Database issues**: See [STEP_1_SUCCESS.md](./docs/STEP_1_SUCCESS.md)
- **AI setup**: See [AI_SETUP_GUIDE.md](./docs/AI_SETUP_GUIDE.md)
- **General questions**: Check [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

**Ready to start training for your next hike?** 🏔️

Run `npm run dev` and visit [http://localhost:3000](http://localhost:3000)!

**Last Updated:** 2026-01-22
**Version:** 1.0.0 (Step 4 Complete)
