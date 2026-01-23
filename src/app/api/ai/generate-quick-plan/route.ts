import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpenRouterClient } from '@/lib/ai/openrouter-client';
import { generateQuickPlanPrompt, type HikeDetails, type UserProfile } from '@/lib/ai/prompt-templates';
import {
  validateAIPlan,
  sanitizeAIPlan,
  convertAIPlanToDBFormat,
  calculatePlanStats,
  type AIPlan,
} from '@/lib/ai/plan-parser';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

interface RequestBody {
  hikeId: string;
  userId?: string;
  fitnessLevel: 'beginner' | 'intermediate' | 'expert' | 'advanced';
  weeksUntilHike: number;
  trainingPreference: 'treadmill' | 'outdoor' | 'mixed';
  includeStrength: boolean;
  daysPerWeek?: number;
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
        { error: 'Invalid fitnessLevel. Must be: beginner, intermediate, expert, or advanced' },
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

    // Build user profile
    const userProfile: UserProfile = {
      fitnessLevel: body.fitnessLevel,
      weeksUntilHike: body.weeksUntilHike,
      trainingPreference: body.trainingPreference || 'mixed',
      includeStrength: body.includeStrength ?? true,
      daysPerWeek: body.daysPerWeek || 4,
    };

    // Build hike details
    const hikeDetails: HikeDetails = {
      name: hike.name,
      distanceMiles: hike.distanceMiles,
      elevationGainFt: hike.elevationGainFt,
      difficulty: hike.difficulty || undefined,
      trailType: hike.trailType || undefined,
      description: hike.description || undefined,
    };

    // Generate prompt
    const prompt = generateQuickPlanPrompt(hikeDetails, userProfile);

    // Call OpenRouter AI
    const client = getOpenRouterClient();
    const response = await client.generateJSON<AIPlan>(prompt, {
      systemPrompt: 'You are an expert hiking trainer and exercise physiologist specializing in progressive training plans. Always respond with valid JSON only.',
      temperature: 0.7,
      maxTokens: 4000,
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

    // Log warnings if any
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
      // Verify user exists
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

    // Return response
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
    console.error('Quick plan generation error:', error);

    // Handle specific error types
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
        error: 'Failed to generate training plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
