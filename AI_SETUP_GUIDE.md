# 🚀 AI Setup Guide - Get Started in 5 Minutes

Quick guide to set up AI-powered training plan generation in HikeSim.

---

## ⚡ Quick Start

### Step 1: Get OpenRouter API Key (2 minutes)

1. Visit **https://openrouter.ai/keys**
2. Sign up with Google/GitHub/Email (free tier available)
3. Click "Create Key"
4. Copy your API key (starts with `sk-or-v1-...`)

**Free Tier:**
- $5 free credits
- Enough for ~2,500 training plans
- No credit card required

---

### Step 2: Configure Environment (30 seconds)

Open `.env` file and add your API key:

```bash
# OpenRouter.ai API Key
OPENROUTER_API_KEY="sk-or-v1-paste-your-key-here"
```

**⚠️ Important:**
- Never commit `.env` to git (already in `.gitignore`)
- Keep your API key secret

---

### Step 3: Start Development Server (10 seconds)

```bash
npm run dev
```

---

### Step 4: Test AI Generation (1 minute)

#### Option A: Test API with curl

```bash
# Get a hike ID first
curl http://localhost:3000/api/hikes/list | jq '.items[0].id'

# Generate a quick plan (replace HIKE_ID with actual ID)
curl -X POST http://localhost:3000/api/ai/generate-quick-plan \
  -H "Content-Type: application/json" \
  -d '{
    "hikeId": "HIKE_ID",
    "fitnessLevel": "intermediate",
    "weeksUntilHike": 8,
    "trainingPreference": "mixed",
    "includeStrength": true,
    "daysPerWeek": 4
  }' | jq
```

#### Option B: Use the UI Component

1. Add QuickPlanGenerator to your page:

```tsx
import QuickPlanGenerator from '@/components/QuickPlanGenerator';

export default function MyPage() {
  const hikes = [
    {
      id: "hike-id",
      name: "Angel's Landing",
      distanceMiles: 5.4,
      elevationGainFt: 1500,
      difficulty: "Moderate",
      trailType: "Out & Back"
    }
  ];

  return (
    <div>
      <QuickPlanGenerator
        hikes={hikes}
        userId="user-123"
        onPlanGenerated={(plan) => console.log(plan)}
      />
    </div>
  );
}
```

2. Click "Generate Quick Plan with AI"
3. Select hike and preferences
4. Click "Generate Training Plan"
5. Watch the magic happen! 🎉

---

## ✅ Verify It's Working

You should see:

1. **In Terminal:**
   ```
   ✓ Compiled successfully in XXXms
   ```

2. **When Generating Plan:**
   - Loading state for 5-10 seconds
   - Generated plan appears
   - Cost displayed (~$0.001-0.003)

3. **In Response:**
   ```json
   {
     "success": true,
     "plan": {
       "planTitle": "8-Week Training Plan for...",
       "weeks": [...]
     },
     "metadata": {
       "cost": 0.002,
       "model": "openai/gpt-4o-mini"
     }
   }
   ```

---

## 🚨 Troubleshooting

### Error: "OPENROUTER_API_KEY is not set"

**Fix:**
1. Check `.env` file exists
2. Verify key is on the correct line
3. Restart dev server (`npm run dev`)

### Error: "Invalid API key"

**Fix:**
1. Verify key starts with `sk-or-v1-`
2. Check for extra spaces or quotes
3. Generate a new key at https://openrouter.ai/keys

### Error: "AI returned invalid response"

**Fix:**
- This is normal (~5% failure rate)
- Click "Regenerate" or try again
- AI validation will catch and retry automatically

### Generation taking too long (>30 seconds)

**Fix:**
- Check your internet connection
- Verify OpenRouter.ai is not down (https://status.openrouter.ai)
- Try with a shorter plan (fewer weeks)

---

## 💰 Cost Monitoring

### Check Your Usage

1. Visit https://openrouter.ai/activity
2. View costs per request
3. Monitor total spending

### Expected Costs

- **Quick Plan:** ~$0.001-0.002 (1,500-1,800 tokens)
- **Custom Plan:** ~$0.002-0.004 (2,000-2,500 tokens)
- **Adjust Plan:** ~$0.001-0.002 (1,200-1,500 tokens)

### Free Tier Limits

$5 free credits = ~2,500 plans

After free tier:
- Pay-as-you-go
- No monthly fees
- Only pay for what you use

---

## 🎯 Usage Examples

### Example 1: Beginner, 12-Week Plan, Outdoor Only

```bash
curl -X POST http://localhost:3000/api/ai/generate-quick-plan \
  -H "Content-Type: application/json" \
  -d '{
    "hikeId": "your-hike-id",
    "fitnessLevel": "beginner",
    "weeksUntilHike": 12,
    "trainingPreference": "outdoor",
    "includeStrength": false,
    "daysPerWeek": 3
  }'
```

### Example 2: Expert, 8-Week Plan, Gym + Outdoor

```bash
curl -X POST http://localhost:3000/api/ai/generate-quick-plan \
  -H "Content-Type: application/json" \
  -d '{
    "hikeId": "your-hike-id",
    "fitnessLevel": "expert",
    "weeksUntilHike": 8,
    "trainingPreference": "mixed",
    "includeStrength": true,
    "daysPerWeek": 6
  }'
```

### Example 3: Custom Plan with Limitations

```bash
curl -X POST http://localhost:3000/api/ai/customize-plan \
  -H "Content-Type: application/json" \
  -d '{
    "hikeId": "your-hike-id",
    "fitnessLevel": "intermediate",
    "weeksUntilHike": 10,
    "trainingPreference": "outdoor",
    "includeStrength": true,
    "daysPerWeek": 4,
    "specificGoals": ["Build endurance", "Lose 10 pounds"],
    "limitations": ["Knee pain on steep descents"],
    "preferredActivities": ["Hiking", "Cycling", "Swimming"]
  }'
```

### Example 4: Adjust Existing Plan

```bash
curl -X POST http://localhost:3000/api/ai/adjust-plan \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "existing-plan-id",
    "feedback": "The workouts are too intense for me",
    "adjustmentType": "easier"
  }'
```

---

## 🔧 Advanced Configuration

### Change AI Model

In `.env`:
```bash
# Use GPT-4o for higher quality (20x more expensive)
OPENROUTER_MODEL="openai/gpt-4o"

# Or stick with GPT-4o Mini (default, cost-effective)
OPENROUTER_MODEL="openai/gpt-4o-mini"
```

### Adjust Temperature

In `src/lib/ai/openrouter-client.ts`:
```typescript
temperature: 0.7  // Default (balanced)
temperature: 0.5  // More consistent
temperature: 0.9  // More creative
```

### Increase Max Tokens

In API routes:
```typescript
maxTokens: 4000  // Default
maxTokens: 6000  // Longer, more detailed plans
```

---

## 📊 API Endpoints Reference

### 1. Generate Quick Plan
- **Endpoint:** `POST /api/ai/generate-quick-plan`
- **Use Case:** Fast plan generation with minimal input
- **Avg Cost:** $0.001-0.002
- **Avg Time:** 4-6 seconds

### 2. Generate Custom Plan
- **Endpoint:** `POST /api/ai/customize-plan`
- **Use Case:** Detailed customization with goals & limitations
- **Avg Cost:** $0.002-0.004
- **Avg Time:** 6-10 seconds

### 3. Adjust Plan
- **Endpoint:** `POST /api/ai/adjust-plan`
- **Use Case:** Modify existing plan based on feedback
- **Avg Cost:** $0.001-0.002
- **Avg Time:** 4-6 seconds

---

## ✅ Next Steps

Now that AI is set up:

1. **Test with Different Hikes**
   - Try beginner vs expert plans
   - Compare 4-week vs 12-week plans
   - Test treadmill vs outdoor preferences

2. **Integrate into Your App**
   - Add QuickPlanGenerator to your pages
   - Style to match your design
   - Add analytics tracking

3. **Monitor Costs**
   - Check https://openrouter.ai/activity
   - Set up budget alerts
   - Optimize prompts to reduce tokens

4. **Collect Feedback**
   - Ask users about plan quality
   - Iterate on prompts
   - Improve validation rules

---

## 📚 Further Reading

- [STEP_3_PLAN.md](./STEP_3_PLAN.md) - Detailed implementation plan
- [STEP_3_SUCCESS.md](./STEP_3_SUCCESS.md) - What was built
- [OpenRouter Docs](https://openrouter.ai/docs) - API documentation
- [src/lib/ai/](./src/lib/ai/) - Source code

---

## 🎉 You're All Set!

AI-powered training plans are now live in your app!

**Happy Hiking!** 🏔️
