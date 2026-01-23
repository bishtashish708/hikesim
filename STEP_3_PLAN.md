# Step 3: AI Integration with OpenRouter.ai

## 🎯 Objective

Integrate OpenRouter.ai to generate personalized, AI-powered training plans based on:
- User's fitness level (beginner/intermediate/expert)
- Target hike details (distance, elevation, difficulty)
- Training preferences (treadmill vs outdoor, strength training)
- Timeline to event

---

## 📋 What We'll Build

### 1. **AI Service Layer**
- OpenRouter.ai SDK integration
- Prompt engineering for training plan generation
- Cost optimization (use GPT-4o Mini)
- Error handling and retries

### 2. **Backend API Endpoints**
- `POST /api/ai/generate-quick-plan` - Quick plan generation
- `POST /api/ai/customize-plan` - Custom plan with preferences
- `POST /api/ai/adjust-plan` - Modify existing plan based on feedback
- `POST /api/ai/get-workout-tips` - Get tips for specific workouts

### 3. **Database Updates**
- Add `aiGenerated` field to TrainingPlan model
- Add `aiModel` field to track which model was used
- Add `generationPrompt` to store the original prompt
- Add `generationMetadata` for cost tracking

### 4. **UI Enhancements**
- "Generate with AI" button in plan builder
- Quick plan modal with AI generation
- Loading states with streaming
- Plan explanation from AI
- Regenerate/adjust options

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Next.js Frontend                    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  UI Components                      │    │
│  │  • QuickPlanGenerator               │    │
│  │  • CustomPlanBuilder (enhanced)     │    │
│  │  • PlanAdjuster                     │    │
│  └────────────────────────────────────┘    │
│           ↓                                 │
│  ┌────────────────────────────────────┐    │
│  │  API Routes                         │    │
│  │  • /api/ai/generate-quick-plan      │    │
│  │  • /api/ai/customize-plan           │    │
│  │  • /api/ai/adjust-plan              │    │
│  └────────────────────────────────────┘    │
│           ↓                                 │
│  ┌────────────────────────────────────┐    │
│  │  AI Service Layer                   │    │
│  │  • OpenRouter client                │    │
│  │  • Prompt templates                 │    │
│  │  • Response parsing                 │    │
│  │  • Cost tracking                    │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                 ↓
    ┌────────────────────────┐
    │  OpenRouter.ai         │
    │  GPT-4o Mini           │
    │  ~$0.001-0.003/plan    │
    └────────────────────────┘
                 ↓
        ┌─────────────────┐
        │  PostgreSQL     │
        │  (Neon)         │
        │  • TrainingPlan │
        │  • User         │
        │  • Hike         │
        └─────────────────┘
```

---

## 📦 Implementation Steps

### Step 3.1: Install Dependencies ✅
```bash
npm install openai  # OpenRouter uses OpenAI SDK format
```

### Step 3.2: Update Prisma Schema ✅
Add AI-related fields to TrainingPlan model:
```prisma
model TrainingPlan {
  // ... existing fields

  // AI Generation metadata
  aiGenerated         Boolean   @default(false)
  aiModel            String?   // e.g., "gpt-4o-mini"
  generationPrompt   String?   @db.Text
  generationMetadata Json?     // {cost, tokens, timestamp}
}
```

### Step 3.3: Create AI Service Layer ✅
**File:** `src/lib/ai/openrouter-client.ts`
- OpenRouter API client wrapper
- Prompt templates for different plan types
- Response parsing and validation
- Cost calculation

**File:** `src/lib/ai/prompt-templates.ts`
- Quick plan generation prompt
- Custom plan generation prompt
- Plan adjustment prompt
- Workout tips prompt

**File:** `src/lib/ai/plan-parser.ts`
- Parse AI response to TrainingPlan format
- Validate workout structure
- Handle edge cases

### Step 3.4: Create API Endpoints ✅
**File:** `src/app/api/ai/generate-quick-plan/route.ts`
- Input: userId, hikeId, fitnessLevel, timeline
- Output: Complete training plan (6-12 weeks)
- Uses GPT-4o Mini (~$0.001-0.002 per plan)

**File:** `src/app/api/ai/customize-plan/route.ts`
- Input: All custom plan builder options
- Output: Customized training plan
- Respects user preferences (treadmill, strength, etc.)

**File:** `src/app/api/ai/adjust-plan/route.ts`
- Input: Existing plan, user feedback
- Output: Adjusted plan
- Use case: "Too hard", "Not enough strength", etc.

### Step 3.5: Create UI Components ✅
**Component:** `src/components/QuickPlanGenerator.tsx`
- Modal with form for quick inputs
- "Generate with AI" button
- Loading state with progress
- Display generated plan
- Save to database option

**Enhancement:** `src/components/TrainingPlanBuilder.tsx`
- Add "Generate with AI" button
- Pre-fill form from AI suggestions
- Show AI explanation

**Component:** `src/components/PlanAdjuster.tsx`
- Feedback form for existing plans
- "Adjust Plan" action
- Show changes made by AI

### Step 3.6: Add Cost Tracking ✅
**File:** `src/lib/ai/cost-tracker.ts`
- Track tokens used
- Calculate cost per request
- Store in database
- Monthly usage reports

---

## 💰 Cost Analysis

### OpenRouter.ai Pricing (GPT-4o Mini)

| Operation | Tokens | Cost per Request | Monthly (100 users) |
|-----------|--------|------------------|---------------------|
| **Quick Plan Generation** | ~2,000 tokens | $0.001 - $0.003 | $0.10 - $0.30 |
| **Custom Plan** | ~3,000 tokens | $0.002 - $0.005 | $0.20 - $0.50 |
| **Plan Adjustment** | ~1,500 tokens | $0.001 - $0.002 | $0.10 - $0.20 |
| **Workout Tips** | ~500 tokens | $0.0005 - $0.001 | $0.05 - $0.10 |

**Total Estimated Cost:**
- **Per user:** $0.004 - $0.011 per month (4 plans generated)
- **100 users:** $0.45 - $1.10 per month
- **1,000 users:** $4.50 - $11.00 per month

**Cost Optimization:**
- Use GPT-4o Mini (20x cheaper than GPT-4)
- Cache common prompts
- Limit regenerations per user
- Use streaming for better UX without extra cost

---

## 🧠 AI Prompt Strategy

### Quick Plan Generation Prompt Template

```
You are an expert hiking trainer. Generate a personalized training plan.

HIKE DETAILS:
- Name: {hikeName}
- Distance: {distance} miles
- Elevation Gain: {elevationGain} ft
- Difficulty: {difficulty}
- Trail Type: {trailType}

USER PROFILE:
- Fitness Level: {fitnessLevel}
- Timeline: {weeks} weeks until hike
- Training Preference: {preference} (treadmill/outdoor/mixed)
- Include Strength: {includeStrength}

REQUIREMENTS:
1. Create a {weeks}-week progressive training plan
2. Include 3-5 workouts per week
3. Gradually increase intensity
4. Peak 1 week before hike, then taper
5. Include rest days
6. For each workout, specify:
   - Type (cardio, strength, rest)
   - Duration in minutes
   - Intensity (easy, moderate, hard)
   - Distance (if applicable)
   - Elevation gain target (if applicable)
   - Specific exercises or activities

OUTPUT FORMAT (JSON):
{
  "planTitle": "...",
  "explanation": "...",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "...",
      "workouts": [
        {
          "day": 1,
          "type": "cardio",
          "title": "...",
          "duration": 45,
          "intensity": "moderate",
          "distanceMiles": 3.0,
          "elevationGainFt": 200,
          "description": "..."
        }
      ]
    }
  ]
}
```

### Custom Plan Prompt Template

Similar to above but with more granular controls:
- Specific days available for training
- Equipment available
- Injury history
- Goal pace/finish time
- Preferred activities

### Adjustment Prompt Template

```
ORIGINAL PLAN:
{originalPlanJSON}

USER FEEDBACK:
{feedback}

ADJUST THE PLAN:
- Keep the same overall structure
- Modify intensity/volume based on feedback
- Maintain progressive overload
- Return ONLY the modified workouts in JSON format
```

---

## 🔧 Implementation Files

### Files to Create (8 new files)

1. **src/lib/ai/openrouter-client.ts** - OpenRouter API wrapper
2. **src/lib/ai/prompt-templates.ts** - Prompt engineering
3. **src/lib/ai/plan-parser.ts** - Parse AI responses
4. **src/lib/ai/cost-tracker.ts** - Track usage and costs
5. **src/app/api/ai/generate-quick-plan/route.ts** - Quick plan API
6. **src/app/api/ai/customize-plan/route.ts** - Custom plan API
7. **src/app/api/ai/adjust-plan/route.ts** - Adjustment API
8. **src/components/QuickPlanGenerator.tsx** - UI component

### Files to Modify (3 files)

1. **prisma/schema.prisma** - Add AI fields
2. **src/components/TrainingPlanBuilder.tsx** - Add AI button
3. **.env** - Add OpenRouter API key

---

## 🔑 Environment Setup

Add to `.env`:
```bash
# OpenRouter.ai
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Get API key from: https://openrouter.ai/keys

---

## ✅ Success Criteria

After Step 3 completion:

- [ ] OpenRouter.ai SDK integrated
- [ ] 3 AI API endpoints working
- [ ] Quick Plan Generator UI functional
- [ ] Plans save to database with AI metadata
- [ ] Cost tracking implemented
- [ ] Plan quality validated (makes sense for hikes)
- [ ] UI shows loading states
- [ ] Error handling for API failures
- [ ] Cost per plan < $0.005
- [ ] Generation time < 10 seconds

---

## 🧪 Testing Plan

### Manual Tests

1. **Generate Quick Plan**
   - Select a hike (e.g., Angel's Landing)
   - Choose fitness level: Beginner
   - Timeline: 8 weeks
   - Verify plan is progressive and makes sense

2. **Generate Custom Plan**
   - All options (treadmill, strength, etc.)
   - Verify plan respects preferences

3. **Adjust Plan**
   - Feedback: "Too hard"
   - Verify intensity is reduced

4. **Cost Tracking**
   - Generate 10 plans
   - Verify total cost < $0.05

### Automated Tests (Future)

- Unit tests for prompt templates
- Integration tests for API endpoints
- E2E tests for UI flow

---

## 📊 Data Flow Example

```
User clicks "Generate Quick Plan"
  ↓
Frontend: QuickPlanGenerator.tsx
  - Shows modal with form
  - User selects: Angel's Landing, Beginner, 8 weeks
  - Clicks "Generate"
  ↓
API: POST /api/ai/generate-quick-plan
  - Validates input
  - Fetches hike details from DB
  - Constructs prompt
  ↓
AI Service: openrouter-client.ts
  - Calls OpenRouter.ai with prompt
  - Model: GPT-4o Mini
  - Returns JSON response
  ↓
Parser: plan-parser.ts
  - Validates response structure
  - Converts to TrainingPlan format
  - Calculates metadata
  ↓
Database: Prisma
  - Saves TrainingPlan with:
    - aiGenerated: true
    - aiModel: "gpt-4o-mini"
    - generationPrompt: "..."
    - generationMetadata: {cost, tokens}
  ↓
Frontend: Display generated plan
  - Show week-by-week breakdown
  - "Save to My Plans" button
  - "Regenerate" option
  - "Adjust Plan" option
```

---

## 🚀 Timeline Estimate

- **Setup & Dependencies:** 15 minutes
- **Schema Update & Migration:** 15 minutes
- **AI Service Layer:** 1 hour
- **API Endpoints:** 1 hour
- **UI Components:** 1.5 hours
- **Testing & Refinement:** 1 hour
- **Documentation:** 30 minutes

**Total: ~5-6 hours**

---

## 🎯 Next Steps After Step 3

Once AI integration is complete:

1. **Step 4:** Deploy backend to Railway/Render (optional, can use Next.js API routes)
2. **Step 5:** Enhance UI with shadcn/ui components
3. **Step 6:** Build workout detail view with interval timer
4. **Step 7:** Create onboarding flow for new users
5. **Step 8:** Implement feedback collection system
6. **Step 9:** Deploy to production (Vercel)

---

## 📝 Notes

- OpenRouter.ai uses OpenAI SDK format (easy integration)
- No need for separate backend initially (use Next.js API routes)
- Can switch to FastAPI later if needed for scaling
- GPT-4o Mini is cost-effective and fast
- Can upgrade to GPT-4 for better quality if needed
- Consider caching similar prompts to reduce costs
- Rate limiting: 1 plan per minute per user

---

## 🔒 Security Considerations

- Store API key in environment variables (never commit)
- Validate all user inputs
- Rate limit API endpoints
- Sanitize AI responses before saving to DB
- Add user quotas (e.g., 5 plans per month free, then paid)
- Log all generations for debugging
- Handle API failures gracefully

---

Ready to implement! Let's start with Step 3.1: Install dependencies and update schema.
