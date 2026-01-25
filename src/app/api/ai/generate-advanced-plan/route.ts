import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hikeId,
      userId,
      fitnessLevel,
      weeksUntilHike,
      trainingDays,
      currentWeeklyMileage,
      currentWeeklyElevation,
      pastExperience,
      injuries,
      trainingPreference,
      treadmillPercentage,
      includeStrength,
      specificGoals,
    } = body;

    // Fetch hike details
    const hike = await prisma.hike.findUnique({
      where: { id: hikeId },
      select: {
        id: true,
        name: true,
        distanceMiles: true,
        elevationGainFt: true,
        difficulty: true,
        trailType: true,
        description: true,
      },
    });

    if (!hike) {
      return NextResponse.json({ error: 'Hike not found' }, { status: 404 });
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const trainingDayNames = trainingDays.map((d: number) => dayNames[d]).join(', ');

    // Build comprehensive prompt with all advanced inputs
    const prompt = `You are an expert hiking trainer creating a highly personalized training plan.

TARGET HIKE:
- Name: ${hike.name}
- Distance: ${hike.distanceMiles} miles
- Elevation Gain: ${hike.elevationGainFt} feet
- Difficulty: ${hike.difficulty || 'Moderate'}
- Trail Type: ${hike.trailType || 'Out And Back'}

ATHLETE PROFILE:
- Current Fitness Level: ${fitnessLevel}
- Training Period: ${weeksUntilHike} weeks
- Training Days: ${trainingDayNames} (${trainingDays.length} days/week)
- Current Weekly Mileage: ${currentWeeklyMileage} miles
- Current Weekly Elevation: ${currentWeeklyElevation} feet
- Past Experience: ${pastExperience || 'Not specified'}
- Injuries/Limitations: ${injuries || 'None reported'}
- Training Preference: ${trainingPreference} ${trainingPreference === 'mixed' ? `(${treadmillPercentage}% treadmill, ${100 - treadmillPercentage}% outdoor)` : ''}
- Include Strength Training: ${includeStrength ? 'Yes' : 'No'}
- Specific Goals: ${specificGoals || 'General preparation'}

Create a detailed, week-by-week training plan that:
1. Progressively builds from current fitness level to hike readiness
2. Respects the specified training days (no workouts on non-training days)
3. Accounts for past experience and any limitations
4. Balances treadmill/outdoor training based on preference
5. Includes strength training if requested
6. Addresses specific goals and concerns
7. Provides realistic, achievable progression

Return ONLY valid JSON in this exact format:
{
  "planTitle": "Descriptive title for this plan",
  "planDescription": "2-3 sentence overview of the training philosophy and approach for this specific athlete",
  "totalWeeks": ${weeksUntilHike},
  "weeks": [
    {
      "weekNumber": 1,
      "weekFocus": "Brief description of this week's focus",
      "totalMiles": 12.5,
      "totalElevation": 1500,
      "workouts": [
        {
          "day": 1,
          "type": "Cardio|Strength|Rest|Recovery",
          "title": "Workout name",
          "duration": 60,
          "intensity": "Easy|Moderate|Hard",
          "distanceMiles": 4.0,
          "elevationGainFt": 500,
          "description": "Detailed workout description with specific instructions",
          "equipment": "Treadmill|Outdoor|Gym"
        }
      ]
    }
  ]
}

CRITICAL: Only schedule workouts on these days: ${trainingDays.join(', ')}. Do not schedule workouts on other days.`;

    const startTime = Date.now();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const generationTime = Date.now() - startTime;

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      return NextResponse.json({ error: 'Failed to parse plan from AI response' }, { status: 500 });
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Calculate stats
    const stats = {
      totalWeeks: plan.weeks.length,
      totalWorkouts: plan.weeks.reduce((sum: number, week: any) => sum + week.workouts.length, 0),
      cardioWorkouts: plan.weeks.reduce(
        (sum: number, week: any) =>
          sum + week.workouts.filter((w: any) => w.type === 'Cardio').length,
        0
      ),
      strengthWorkouts: plan.weeks.reduce(
        (sum: number, week: any) =>
          sum + week.workouts.filter((w: any) => w.type === 'Strength').length,
        0
      ),
      restDays: plan.weeks.reduce(
        (sum: number, week: any) =>
          sum + week.workouts.filter((w: any) => w.type === 'Rest').length,
        0
      ),
      totalMiles: plan.weeks.reduce((sum: number, week: any) => sum + week.totalMiles, 0),
      totalElevation: plan.weeks.reduce((sum: number, week: any) => sum + week.totalElevation, 0),
      avgWorkoutsPerWeek:
        plan.weeks.reduce((sum: number, week: any) => sum + week.workouts.length, 0) /
        plan.weeks.length,
      avgMilesPerWeek:
        plan.weeks.reduce((sum: number, week: any) => sum + week.totalMiles, 0) /
        plan.weeks.length,
    };

    // Calculate cost (sonnet-4 pricing: $3/MTok input, $15/MTok output)
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const cost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

    // Save to database if userId provided
    let savedPlanId: string | undefined;
    if (userId && userId !== 'anonymous') {
      try {
        const savedPlan = await prisma.trainingPlan.create({
          data: {
            userId: userId,
            hikeId: hike.id,
            planData: plan,
            fitnessLevel: fitnessLevel,
            weeksUntilHike: weeksUntilHike,
            generatedAt: new Date(),
          },
        });
        savedPlanId = savedPlan.id;
      } catch (dbError) {
        console.error('Failed to save plan to database:', dbError);
        // Continue anyway - plan was generated successfully
      }
    }

    return NextResponse.json({
      plan,
      stats,
      metadata: {
        saved: !!savedPlanId,
        planId: savedPlanId,
        cost: parseFloat(cost.toFixed(6)),
        tokensUsed: inputTokens + outputTokens,
        model: 'claude-sonnet-4-20250514',
        generationTime,
      },
    });
  } catch (error) {
    console.error('Error generating advanced plan:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate training plan',
      },
      { status: 500 }
    );
  }
}
