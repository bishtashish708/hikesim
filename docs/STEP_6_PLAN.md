# 📋 Step 6: Plan Adjustment UI - Implementation Plan

**Status:** 🟡 Ready to Implement
**Difficulty:** Medium
**Estimated Scope:** ~500 lines of code across 3-4 files
**API Status:** ✅ Already exists ([src/app/api/ai/adjust-plan/route.ts](../src/app/api/ai/adjust-plan/route.ts))

---

## 🎯 Objective

Enable users to adjust their training plans with AI assistance through an interactive modal interface. Users can request changes like "make it easier," "add more strength training," or provide custom feedback. The system shows a preview of changes before saving.

---

## ✅ What Already Exists

### 1. API Endpoint (Complete)
**File:** [src/app/api/ai/adjust-plan/route.ts](../src/app/api/ai/adjust-plan/route.ts)

**Capabilities:**
- Accepts plan ID, feedback, and adjustment type
- Calls OpenRouter AI to adjust plan
- Validates and sanitizes adjusted plan
- Saves as new plan OR creates revision
- Returns adjusted plan with stats and metadata

**Request Format:**
```typescript
POST /api/ai/adjust-plan
{
  planId: string;
  feedback: string;
  adjustmentType: 'easier' | 'harder' | 'more_strength' | 'less_strength' | 'custom';
  userId?: string;
  saveAsNew?: boolean; // Default: true
}
```

**Response Format:**
```typescript
{
  success: true,
  adjustedPlan: { weeks: [...], settings: {...} },
  stats: { totalWorkouts, totalMiles, totalElevation, avgWorkoutsPerWeek },
  metadata: {
    saved: boolean,
    planId: string,
    savedAsNew: boolean,
    adjustmentType: string,
    cost: number,
    tokensUsed: number,
    model: string,
    generationTime: number
  },
  validation: { valid: true, warnings: [] }
}
```

### 2. Database Models (Complete)
- **TrainingPlan** - Main plan with `aiGenerated`, `aiModel`, `generationMetadata`
- **TrainingPlanRevision** - Revision history with `changeLog`

### 3. AI Infrastructure (Complete)
- OpenRouter client ([src/lib/ai/openrouter-client.ts](../src/lib/ai/openrouter-client.ts))
- Plan parser and validator ([src/lib/ai/plan-parser.ts](../src/lib/ai/plan-parser.ts))
- Prompt templates ([src/lib/ai/prompt-templates.ts](../src/lib/ai/prompt-templates.ts))

---

## 🛠️ What Needs to Be Built

### 1. Plan Adjuster Modal Component
**File:** `src/components/PlanAdjusterModal.tsx` (NEW)

**Purpose:** Interactive modal for adjusting training plans

**Props:**
```typescript
interface PlanAdjusterModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlanId?: string) => void;
}
```

**UI Sections:**

#### Section 1: Adjustment Type Selection
- Quick options (pills/buttons):
  - "Make it easier" → `easier`
  - "Make it harder" → `harder`
  - "More strength training" → `more_strength`
  - "Less strength training" → `less_strength`
  - "Custom request" → `custom`
- Visual selection state (active/inactive)

#### Section 2: Feedback Input
- Text area for user feedback
- Character limit (500 chars)
- Placeholder text based on selected adjustment type:
  - Easier: "e.g., Reduce weekly mileage by 20%"
  - Harder: "e.g., Add hill intervals to long runs"
  - More strength: "e.g., Include core exercises 3x/week"
  - Less strength: "e.g., Focus only on hiking-specific workouts"
  - Custom: "Describe what you'd like to change..."

#### Section 3: Save Options
- Radio buttons:
  - "Create new plan (recommended)" - Default
  - "Update current plan"
- Explanation text for each option

#### Section 4: Preview (After Generation)
- Side-by-side comparison:
  - Original plan stats
  - New plan stats
- Diff highlights:
  - Total workouts (original → new)
  - Total miles (original → new)
  - Total elevation (original → new)
  - Avg workouts/week (original → new)

#### Section 5: Cost & Metadata
- AI cost display (~$0.002-0.004)
- Tokens used
- Model used (GPT-4o Mini)
- Generation time

**States:**
- `idle` - Initial state, form inputs
- `generating` - Loading spinner, API call in progress
- `preview` - Show adjusted plan preview
- `saving` - Saving to database
- `success` - Show success message
- `error` - Show error message

**Actions:**
- "Generate Preview" button (from idle → generating)
- "Cancel" button (close modal)
- "Save Plan" button (from preview → saving)
- "Adjust Again" button (from preview → idle)

**Features:**
- Smooth animations (fade in/out, slide)
- Loading states with spinner
- Error handling with user-friendly messages
- Keyboard shortcuts (Escape to close)
- Click outside to close
- Responsive design (mobile-friendly)

---

### 2. Update Plan Detail Page
**File:** `src/app/training-plans/[id]/page.tsx` (MODIFY)

**Changes Required:**

#### Add "Adjust Plan" Button
- Location: Near top of page, next to plan title or in actions section
- Button style: Secondary action (purple/indigo for AI feature)
- Icon: Magic wand or sparkles
- Text: "Adjust with AI ✨"

#### Add Modal State
```typescript
const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
```

#### Add Success Handler
```typescript
const handleAdjustSuccess = (newPlanId?: string) => {
  if (newPlanId) {
    // New plan created - redirect to new plan
    router.push(`/training-plans/${newPlanId}`);
  } else {
    // Plan updated - refresh current page
    router.refresh();
  }
  setIsAdjusterOpen(false);
};
```

#### Render Modal
```typescript
<PlanAdjusterModal
  planId={plan.id}
  isOpen={isAdjusterOpen}
  onClose={() => setIsAdjusterOpen(false)}
  onSuccess={handleAdjustSuccess}
/>
```

---

### 3. Optional: Plan Comparison Component
**File:** `src/components/PlanComparison.tsx` (NEW, OPTIONAL)

**Purpose:** Reusable component for comparing two plans side-by-side

**Props:**
```typescript
interface PlanComparisonProps {
  originalPlan: { weeks: any[], settings: any };
  adjustedPlan: { weeks: any[], settings: any };
}
```

**Display:**
- Two-column layout (Original | Adjusted)
- Key metrics comparison
- Highlighted differences (green for increases, amber for decreases)

---

## 📝 Implementation Steps

### Phase 1: Core Modal Component (Priority 1)
1. Create `src/components/PlanAdjusterModal.tsx`
2. Implement adjustment type selection UI
3. Implement feedback text area
4. Implement save options (radio buttons)
5. Add loading state with spinner
6. Add error handling and display

### Phase 2: API Integration (Priority 1)
7. Connect to `/api/ai/adjust-plan` endpoint
8. Handle API response and errors
9. Parse adjusted plan data
10. Calculate stats for preview

### Phase 3: Preview UI (Priority 2)
11. Build preview section with stats comparison
12. Add "Save Plan" and "Adjust Again" buttons
13. Implement state transitions (idle → generating → preview)

### Phase 4: Page Integration (Priority 1)
14. Add "Adjust Plan" button to plan detail page
15. Add modal state management
16. Implement success/error handlers
17. Test full flow end-to-end

### Phase 5: Polish (Priority 3)
18. Add smooth animations
19. Add keyboard shortcuts
20. Improve responsive design for mobile
21. Add cost transparency messaging

---

## 🎨 Design Specifications

### Modal Layout
- **Width:** 600px (desktop), full-width - 32px (mobile)
- **Max height:** 90vh with scroll
- **Padding:** 24px
- **Border radius:** 16px
- **Background:** White with subtle shadow
- **Backdrop:** Semi-transparent black (opacity 0.5)

### Color Palette
- **Primary Action:** Indigo/Purple (AI feature)
- **Success:** Emerald green
- **Error:** Red
- **Neutral:** Slate gray
- **Background:** White, Slate-50

### Typography
- **Heading:** 1.5rem, font-semibold
- **Subheading:** 1rem, font-medium
- **Body:** 0.875rem, regular
- **Label:** 0.75rem, font-semibold, uppercase

### Button Styles
- **Adjustment Type Pills:** Rounded-full, border-2, px-4, py-2
  - Active: bg-indigo-100, border-indigo-500, text-indigo-700
  - Inactive: bg-white, border-gray-200, text-gray-700
- **Primary CTA:** bg-indigo-600, text-white, rounded-full, px-6, py-3
- **Secondary:** border-gray-300, text-gray-700, rounded-full

---

## 🧪 Testing Checklist

### Unit Tests (Optional)
- [ ] Modal opens and closes correctly
- [ ] Adjustment type selection updates state
- [ ] Feedback input validation
- [ ] API call with correct parameters
- [ ] Error states display correctly

### Manual Testing (Required)
- [ ] Open modal from plan detail page
- [ ] Select each adjustment type (easier, harder, etc.)
- [ ] Enter feedback and generate preview
- [ ] Preview shows correct stats comparison
- [ ] Save as new plan creates new plan and redirects
- [ ] Update existing plan refreshes page
- [ ] Error handling works (invalid planId, network error)
- [ ] Loading states appear during API call
- [ ] Mobile responsive design works
- [ ] Keyboard shortcuts work (Escape to close)
- [ ] Click outside modal to close

### Edge Cases
- [ ] Empty feedback (should show error)
- [ ] Invalid planId (should show error)
- [ ] Network timeout (should show error)
- [ ] AI returns invalid plan (should show error)
- [ ] User not authenticated (should block)
- [ ] Plan doesn't belong to user (should block)

---

## 💰 Cost Impact

- **AI Cost per Adjustment:** ~$0.002-0.004 (similar to plan generation)
- **Expected Usage:** ~1-3 adjustments per user per plan
- **Monthly Cost (100 users, 2 adjustments each):** ~$0.40-0.80

**Cost Transparency:**
- Show cost to user before generating
- Display in preview section
- Add to plan metadata

---

## 🔐 Security Considerations

- ✅ API validates user owns the plan (already implemented)
- ✅ Server-side session authentication (NextAuth)
- ✅ Plan sanitization and validation (already implemented)
- ✅ Rate limiting (inherited from OpenRouter)
- ⚠️ TODO: Add client-side plan ownership check in modal
- ⚠️ TODO: Add debouncing on "Generate Preview" button (prevent double-clicks)

---

## 📊 Success Metrics

### User Engagement
- % of users who adjust at least one plan
- Average adjustments per plan
- Most common adjustment types

### Technical Performance
- Average adjustment generation time (<10 seconds)
- Success rate of adjustments (>95%)
- Cost per adjustment (~$0.002-0.004)

### User Satisfaction
- % of users who save adjusted plan
- % who adjust again after first adjustment
- Feedback on adjustment quality

---

## 🚀 Future Enhancements (Post-Step 6)

1. **Adjustment History:** Show list of all adjustments made to a plan
2. **Undo Adjustment:** Revert to previous plan version
3. **Smart Suggestions:** AI suggests adjustments based on workout feedback
4. **Bulk Adjustments:** Adjust multiple plans at once
5. **A/B Testing:** Compare two adjusted versions side-by-side
6. **Voice Input:** Use speech-to-text for feedback
7. **Templates:** Save adjustment patterns as templates

---

## 📚 Related Files

### Files to Create
- `src/components/PlanAdjusterModal.tsx` (~400 lines)
- `src/components/PlanComparison.tsx` (~100 lines, optional)

### Files to Modify
- `src/app/training-plans/[id]/page.tsx` (+30 lines)

### Files to Reference
- `src/app/api/ai/adjust-plan/route.ts` (API endpoint)
- `src/lib/ai/openrouter-client.ts` (AI client)
- `src/lib/ai/plan-parser.ts` (Plan validation)
- `src/components/QuickPlanGenerator.tsx` (Similar modal pattern)

---

## 🎯 Implementation Priority

### Must Have (MVP)
1. ✅ Adjustment type selection
2. ✅ Feedback input
3. ✅ API integration
4. ✅ Preview with stats comparison
5. ✅ Save as new plan
6. ✅ Error handling
7. ✅ Loading states

### Should Have
8. ✅ Update existing plan option
9. ✅ Cost display
10. ⚠️ Responsive mobile design
11. ⚠️ Keyboard shortcuts

### Nice to Have
12. ⏸️ Smooth animations
13. ⏸️ Plan comparison component
14. ⏸️ Adjustment history
15. ⏸️ Undo functionality

---

## 💡 Key Design Decisions

### Why Modal Instead of Separate Page?
- **Faster:** No page navigation required
- **Context:** User stays on current plan page
- **Preview:** Can compare original and adjusted side-by-side
- **Common Pattern:** Used by QuickPlanGenerator successfully

### Why "Save as New Plan" Default?
- **Safety:** Preserves original plan
- **Experimentation:** Users can try multiple adjustments
- **History:** Creates audit trail of changes
- **Undo:** Easy to revert to original

### Why Show Preview Before Saving?
- **Transparency:** User sees changes before committing
- **Confidence:** Reduces anxiety about AI changes
- **Control:** User can adjust again if not satisfied
- **Cost Awareness:** Shows AI cost upfront

---

## 🏁 Definition of Done

- [x] API endpoint exists and works (`/api/ai/adjust-plan`)
- [ ] PlanAdjusterModal component created
- [ ] Modal integrated into plan detail page
- [ ] User can select adjustment type
- [ ] User can enter feedback
- [ ] Preview shows stats comparison
- [ ] User can save as new plan or update existing
- [ ] Error states handled gracefully
- [ ] Loading states display correctly
- [ ] Mobile responsive design works
- [ ] Build passes without errors
- [ ] Manual testing completed
- [ ] Documentation updated (STEP_6_SUCCESS.md)
- [ ] Changes committed and pushed to GitHub

---

**Plan Status:** ✅ Ready to Implement
**Next Action:** Create `src/components/PlanAdjusterModal.tsx`
**Estimated Time:** 2-3 hours for MVP

🎯 **Let's build the Plan Adjustment UI!**
