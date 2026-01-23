import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpenRouterClient } from '@/lib/ai/openrouter-client';
import { generateCustomPlanPrompt, type HikeDetails, type CustomPlanOptions } from '@/lib/ai/prompt-templates';
import {
  validateAIPlan,
  sanitizeAIPlan,
  convertAIPlanToDBFormat,
  calculatePlanStats,
  type AIPlan,
} from '@/lib/ai/plan-parser';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody extends CustomPlanOptions {
  hikeId: string;
  userId?: string;
  trainingStartDate?: string;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();

    // Validate input
    if (!body.hikeId) {
      return NextResponse.json(
        { error: 'hikeId is required' },
        { status: 400 }
      );
    }

    if (!body.fitnessLevel || !['beginner', 'intermediate', 'expert', 'advanced'].includes(body.fitnessLevel)) {
      return NextResponse.json(
        { error: 'Invalid fitnessLevel' },
        { status: 400 }
      );
    }

    if (!body.weeksUntilHike || body.weeksUntilHike < 4 || body.weeksUntilHike > 24) {
      return NextResponse.json(
        { error: 'weeksUntilHike must be between 4 and 24' },
        { status: 400 }
      );
    }

    // Fetch hike details
    const hike = await prisma.hike.findUnique({
      where: { id: body.hikeId },
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
      return NextResponse.json(
        { error: 'Hike not found' },
        { status: 404 }
      );
    }

    // Build hike details
    const hikeDetails: HikeDetails = {
      name: hike.name,
      distanceMiles: hike.distanceMiles,
      elevationGainFt: hike.elevationGainFt,
      difficulty: hike.difficulty || undefined,
      trailType: hike.trailType || undefined,
      description: hike.description || undefined,
    };

    // Build custom options
    const customOptions: CustomPlanOptions = {
      fitnessLevel: body.fitnessLevel,
      weeksUntilHike: body.weeksUntilHike,
      trainingPreference: body.trainingPreference || 'mixed',
      includeStrength: body.includeStrength ?? true,
      daysPerWeek: body.daysPerWeek || 4,
      specificGoals: body.specificGoals || [],
      limitations: body.limitations || [],
      preferredActivities: body.preferredActivities || [],
      trainingDays: body.trainingDays || [],
      hasEquipment: body.hasEquipment ?? true,
    };

    // Generate prompt
    const prompt = generateCustomPlanPrompt(hikeDetails, customOptions);

    // Call OpenRouter AI
    const client = getOpenRouterClient();
    const response = await client.generateJSON<AIPlan>(prompt, {
      systemPrompt: 'You are an expert hiking trainer and exercise physiologist. Create personalized, progressive training plans that respect user limitations and preferences. Always respond with valid JSON only.',
      temperature: 0.8, // Slightly higher for more customization
      maxTokens: 5000,  // More tokens for detailed custom plans
    });

    // Sanitize and validate the plan
    const sanitizedPlan = sanitizeAIPlan(response.data);
    const validation = validateAIPlan(sanitizedPlan);

    if (!validation.valid) {
      console.error('AI plan validation failed:', validation.errors);
      return NextResponse.json(
        {
          error: 'Generated plan failed validation',
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('AI plan validation warnings:', validation.warnings);
    }

    // Calculate dates
    const trainingStartDate = body.trainingStartDate
      ? new Date(body.trainingStartDate)
      : new Date();

    const targetDate = new Date(trainingStartDate);
    targetDate.setDate(targetDate.getDate() + (body.weeksUntilHike * 7));

    // Convert to database format
    const dbPlan = convertAIPlanToDBFormat(sanitizedPlan, {
      hikeId: hike.id,
      userId: body.userId || 'anonymous',
      trainingStartDate,
      targetDate,
      aiModel: response.metadata.model,
      generationPrompt: prompt,
      generationMetadata: response.metadata,
    });

    // Save to database if userId provided
    let savedPlan = null;
    if (body.userId && body.userId !== 'anonymous') {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
      });

      if (user) {
        savedPlan = await prisma.trainingPlan.create({
          data: dbPlan,
        });
      }
    }

    // Calculate statistics
    const stats = calculatePlanStats(sanitizedPlan);

    return NextResponse.json({
      success: true,
      plan: sanitizedPlan,
      stats,
      metadata: {
        saved: !!savedPlan,
        planId: savedPlan?.id,
        cost: response.metadata.costUSD,
        tokensUsed: response.metadata.totalTokens,
        model: response.metadata.model,
        generationTime: response.metadata.durationMs,
      },
      validation: {
        valid: validation.valid,
        warnings: validation.warnings,
      },
    });
  } catch (error) {
    console.error('Custom plan generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('OPENROUTER_API_KEY')) {
        return NextResponse.json(
          { error: 'AI service not configured. Please set OPENROUTER_API_KEY.' },
          { status: 500 }
        );
      }

      if (error.message.includes('Invalid JSON')) {
        return NextResponse.json(
          { error: 'AI returned invalid response format. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to generate custom training plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
