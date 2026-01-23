/**
 * AI Prompt Templates for Training Plan Generation
 *
 * These templates are used to generate personalized hiking training plans
 * using OpenRouter.ai (GPT-4o Mini)
 */

export interface HikeDetails {
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  difficulty?: string;
  trailType?: string;
  description?: string;
}

export interface UserProfile {
  fitnessLevel: 'beginner' | 'intermediate' | 'expert' | 'advanced';
  weeksUntilHike: number;
  trainingPreference: 'treadmill' | 'outdoor' | 'mixed';
  includeStrength: boolean;
  daysPerWeek?: number;
  hasEquipment?: boolean;
  experienceLevel?: string;
}

export interface CustomPlanOptions extends UserProfile {
  specificGoals?: string[];
  limitations?: string[];
  preferredActivities?: string[];
  trainingDays?: number[];
}

/**
 * Generate prompt for quick plan generation
 */
export function generateQuickPlanPrompt(
  hike: HikeDetails,
  profile: UserProfile
): string {
  const daysPerWeek = profile.daysPerWeek || 4;

  return `You are an expert hiking trainer and exercise physiologist. Generate a personalized training plan for the following hike:

HIKE DETAILS:
- Name: ${hike.name}
- Distance: ${hike.distanceMiles} miles
- Elevation Gain: ${hike.elevationGainFt} feet
- Difficulty: ${hike.difficulty || 'Unknown'}
- Trail Type: ${hike.trailType || 'Unknown'}
${hike.description ? `- Description: ${hike.description}` : ''}

USER PROFILE:
- Fitness Level: ${profile.fitnessLevel}
- Timeline: ${profile.weeksUntilHike} weeks until hike
- Training Preference: ${profile.trainingPreference}
- Include Strength Training: ${profile.includeStrength ? 'Yes' : 'No'}
- Days Per Week: ${daysPerWeek}

REQUIREMENTS:
1. Create a ${profile.weeksUntilHike}-week progressive training plan
2. Include ${daysPerWeek} workouts per week (${profile.includeStrength ? 'cardio + strength' : 'primarily cardio'})
3. Gradually increase intensity and volume
4. Peak 1-2 weeks before hike, then taper
5. Include rest days for recovery
6. Match training to ${profile.trainingPreference} preference
7. For ${profile.fitnessLevel} fitness level, start conservatively and build gradually

For each workout, specify:
- Type: "cardio", "strength", "rest", "recovery", or "mixed"
- Title: Short descriptive name
- Duration: Minutes
- Intensity: "easy", "moderate", "hard", or "very_hard"
- Distance: Miles (for cardio workouts, can be 0)
- Elevation Gain: Feet (for cardio workouts, can be 0)
- Description: Detailed instructions (2-3 sentences)
- Equipment: Any equipment needed (optional)

IMPORTANT GUIDELINES:
- Week 1 should be 40-50% of target intensity
- Peak week should be 90-100% of target intensity
- Final week should taper to 50-60% for recovery
- Include progressive elevation training
- Balance intensity with adequate recovery
- For beginners: prioritize consistency over intensity
- For intermediate: add varied terrain and longer sessions
- For experts: include back-to-back long sessions and high-intensity intervals

OUTPUT FORMAT (JSON):
{
  "planTitle": "Descriptive plan title",
  "planDescription": "2-3 sentence overview of the plan's approach",
  "totalWeeks": ${profile.weeksUntilHike},
  "targetHikeName": "${hike.name}",
  "fitnessLevel": "${profile.fitnessLevel}",
  "weeks": [
    {
      "weekNumber": 1,
      "weekFocus": "Brief description of this week's training focus",
      "totalMiles": 0,
      "totalElevation": 0,
      "workouts": [
        {
          "day": 1,
          "type": "cardio",
          "title": "Easy Base Building Hike",
          "duration": 45,
          "intensity": "easy",
          "distanceMiles": 3.0,
          "elevationGainFt": 200,
          "description": "Start with an easy-paced hike on gentle terrain. Focus on maintaining steady breathing and good hiking form.",
          "equipment": "hiking boots, water, light pack (5-10 lbs)"
        },
        {
          "day": 3,
          "type": "strength",
          "title": "Lower Body Foundation",
          "duration": 30,
          "intensity": "moderate",
          "distanceMiles": 0,
          "elevationGainFt": 0,
          "description": "Squats 3x10, lunges 3x10 each leg, step-ups 3x10 each leg. Focus on form.",
          "equipment": "bodyweight or light dumbbells"
        }
      ]
    }
  ]
}

Return ONLY valid JSON, no additional text.`;
}

/**
 * Generate prompt for custom plan with detailed preferences
 */
export function generateCustomPlanPrompt(
  hike: HikeDetails,
  options: CustomPlanOptions
): string {
  const basePrompt = generateQuickPlanPrompt(hike, options);

  const customizations = [];

  if (options.specificGoals && options.specificGoals.length > 0) {
    customizations.push(`SPECIFIC GOALS:\n${options.specificGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}`);
  }

  if (options.limitations && options.limitations.length > 0) {
    customizations.push(`LIMITATIONS/INJURIES:\n${options.limitations.map((l, i) => `${i + 1}. ${l}`).join('\n')}`);
  }

  if (options.preferredActivities && options.preferredActivities.length > 0) {
    customizations.push(`PREFERRED ACTIVITIES:\n${options.preferredActivities.join(', ')}`);
  }

  if (options.trainingDays && options.trainingDays.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableDays = options.trainingDays.map(d => dayNames[d]).join(', ');
    customizations.push(`AVAILABLE TRAINING DAYS:\n${availableDays}`);
  }

  if (customizations.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

ADDITIONAL CUSTOMIZATIONS:
${customizations.join('\n\n')}

Please incorporate these customizations into the plan while maintaining progressive overload and proper recovery.`;
}

/**
 * Generate prompt for plan adjustment based on feedback
 */
export function generatePlanAdjustmentPrompt(
  originalPlan: unknown,
  feedback: string,
  adjustmentType: 'easier' | 'harder' | 'more_strength' | 'less_strength' | 'custom'
): string {
  const adjustmentGuidance = {
    easier: 'Reduce intensity by 15-20%, decrease volume by 10-15%, add more recovery time',
    harder: 'Increase intensity by 10-15%, add more volume, include more challenging workouts',
    more_strength: 'Add 1-2 more strength sessions per week, increase strength workout duration',
    less_strength: 'Reduce strength sessions, focus more on cardio and hiking-specific training',
    custom: 'Follow the specific feedback provided',
  };

  return `You are an expert hiking trainer. Adjust the following training plan based on user feedback.

ORIGINAL PLAN:
${JSON.stringify(originalPlan, null, 2)}

USER FEEDBACK:
${feedback}

ADJUSTMENT TYPE: ${adjustmentType}
GUIDANCE: ${adjustmentGuidance[adjustmentType]}

REQUIREMENTS:
1. Maintain the overall structure and number of weeks
2. Apply the requested adjustments consistently across all weeks
3. Ensure the plan remains progressive and balanced
4. Keep the same JSON format as the original plan
5. Update the "weekFocus" to reflect changes
6. Adjust total miles and elevation for each week

Return the COMPLETE ADJUSTED PLAN in JSON format (same structure as original).`;
}

/**
 * Generate prompt for workout tips and guidance
 */
export function generateWorkoutTipsPrompt(
  workoutType: string,
  hikeDetails: HikeDetails,
  userLevel: string
): string {
  return `You are an expert hiking trainer. Provide specific tips and guidance for this workout type.

WORKOUT TYPE: ${workoutType}
TARGET HIKE: ${hikeDetails.name} (${hikeDetails.distanceMiles} mi, ${hikeDetails.elevationGainFt} ft gain)
USER LEVEL: ${userLevel}

Provide a JSON response with:
{
  "tips": [
    "Tip 1 (actionable, specific)",
    "Tip 2",
    "Tip 3"
  ],
  "commonMistakes": [
    "Mistake 1 to avoid",
    "Mistake 2 to avoid"
  ],
  "progressionIdeas": [
    "How to make this workout harder",
    "Variation to try"
  ],
  "safetyNotes": [
    "Important safety consideration",
    "Warning or precaution"
  ]
}

Keep tips concise (1-2 sentences each) and actionable.`;
}

/**
 * Generate prompt for explaining a generated plan
 */
export function generatePlanExplanationPrompt(
  plan: unknown,
  hike: HikeDetails
): string {
  return `You are an expert hiking trainer. Explain the rationale behind this training plan in simple terms.

TRAINING PLAN:
${JSON.stringify(plan, null, 2)}

TARGET HIKE:
${hike.name} - ${hike.distanceMiles} miles, ${hike.elevationGainFt} feet elevation gain

Provide a JSON response with:
{
  "overview": "2-3 sentence summary of the plan's approach",
  "weeklyBreakdown": [
    {
      "week": 1,
      "rationale": "Why this week is structured this way"
    }
  ],
  "keyPrinciples": [
    "Principle 1 (e.g., progressive overload)",
    "Principle 2",
    "Principle 3"
  ],
  "expectedOutcomes": [
    "What the user should achieve",
    "Fitness adaptations to expect"
  ]
}

Keep explanations clear and motivating.`;
}

/**
 * Validate and extract JSON from AI response
 */
export function extractJSON<T = unknown>(response: string): T {
  // Try to find JSON in the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response');
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', jsonMatch[0]);
    throw new Error('Invalid JSON in AI response');
  }
}
