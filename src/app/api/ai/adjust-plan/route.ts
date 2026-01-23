import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOpenRouterClient } from '@/lib/ai/openrouter-client';
import { generatePlanAdjustmentPrompt } from '@/lib/ai/prompt-templates';
import {
  validateAIPlan,
  sanitizeAIPlan,
  calculatePlanStats,
  type AIPlan,
} from '@/lib/ai/plan-parser';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

type AdjustmentType = 'easier' | 'harder' | 'more_strength' | 'less_strength' | 'custom';

interface RequestBody {
  planId: string;
  feedback: string;
  adjustmentType: AdjustmentType;
  userId?: string;
  saveAsNew?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();

    // Validate input
    if (!body.planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      );
    }

    if (!body.feedback || body.feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'feedback is required' },
        { status: 400 }
      );
    }

    const validAdjustmentTypes: AdjustmentType[] = ['easier', 'harder', 'more_strength', 'less_strength', 'custom'];
    if (!body.adjustmentType || !validAdjustmentTypes.includes(body.adjustmentType)) {
      return NextResponse.json(
        { error: 'Invalid adjustmentType. Must be: easier, harder, more_strength, less_strength, or custom' },
        { status: 400 }
      );
    }

    // Fetch existing plan
    const existingPlan = await prisma.trainingPlan.findUnique({
      where: { id: body.planId },
      include: {
        hike: {
          select: {
            id: true,
            name: true,
            distanceMiles: true,
            elevationGainFt: true,
          },
        },
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Training plan not found' },
        { status: 404 }
      );
    }

    // Verify user owns the plan (if userId provided)
    if (body.userId && existingPlan.userId !== body.userId) {
      return NextResponse.json(
        { error: 'Unauthorized. You do not own this plan.' },
        { status: 403 }
      );
    }

    // Extract original plan structure
    const originalPlan = {
      settings: existingPlan.settings,
      weeks: existingPlan.weeks,
    };

    // Generate adjustment prompt
    const prompt = generatePlanAdjustmentPrompt(
      originalPlan,
      body.feedback,
      body.adjustmentType
    );

    // Call OpenRouter AI
    const client = getOpenRouterClient();
    const response = await client.generateJSON<AIPlan>(prompt, {
      systemPrompt: 'You are an expert hiking trainer. Adjust training plans based on user feedback while maintaining progressive overload principles. Always respond with valid JSON only.',
      temperature: 0.6, // Lower temperature for more consistent adjustments
      maxTokens: 4000,
    });

    // Sanitize and validate the adjusted plan
    const sanitizedPlan = sanitizeAIPlan(response.data);
    const validation = validateAIPlan(sanitizedPlan);

    if (!validation.valid) {
      console.error('Adjusted plan validation failed:', validation.errors);
      return NextResponse.json(
        {
          error: 'Adjusted plan failed validation',
          details: validation.errors,
        },
        { status: 500 }
      );
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('Adjusted plan validation warnings:', validation.warnings);
    }

    // Calculate stats for comparison
    const newStats = calculatePlanStats(sanitizedPlan);

    // Save adjustment
    let savedPlan = null;
    const saveAsNew = body.saveAsNew ?? true;

    if (body.userId && body.userId !== 'anonymous') {
      if (saveAsNew) {
        // Create new plan with adjusted data
        savedPlan = await prisma.trainingPlan.create({
          data: {
            hikeId: existingPlan.hikeId,
            userId: body.userId,
            trainingStartDate: existingPlan.trainingStartDate,
            targetDate: existingPlan.targetDate,
            settings: {
              ...(sanitizedPlan as unknown as Record<string, unknown>),
              adjustedFrom: existingPlan.id,
              adjustmentType: body.adjustmentType,
              adjustmentFeedback: body.feedback,
            },
            weeks: sanitizedPlan.weeks as unknown as Prisma.InputJsonValue,
            aiGenerated: true,
            aiModel: response.metadata.model,
            generationPrompt: prompt,
            generationMetadata: {
              ...response.metadata,
              adjustmentType: body.adjustmentType,
              originalPlanId: existingPlan.id,
            },
          },
        });
      } else {
        // Create revision for existing plan
        await prisma.trainingPlanRevision.create({
          data: {
            trainingPlanId: existingPlan.id,
            settings: {
              ...(sanitizedPlan as unknown as Record<string, unknown>),
              adjustmentType: body.adjustmentType,
            },
            weeks: sanitizedPlan.weeks as unknown as Prisma.InputJsonValue,
            changeLog: {
              adjustmentType: body.adjustmentType,
              feedback: body.feedback,
              timestamp: new Date().toISOString(),
              costUSD: response.metadata.costUSD,
            },
          },
        });

        // Update the main plan
        savedPlan = await prisma.trainingPlan.update({
          where: { id: existingPlan.id },
          data: {
            settings: {
              ...(sanitizedPlan as unknown as Record<string, unknown>),
              adjustedFrom: existingPlan.id,
              adjustmentType: body.adjustmentType,
            },
            weeks: sanitizedPlan.weeks as unknown as Prisma.InputJsonValue,
            aiModel: response.metadata.model,
            generationPrompt: prompt,
            generationMetadata: {
              ...response.metadata,
              adjustmentType: body.adjustmentType,
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      adjustedPlan: sanitizedPlan,
      stats: newStats,
      metadata: {
        saved: !!savedPlan,
        planId: savedPlan?.id,
        savedAsNew: saveAsNew,
        adjustmentType: body.adjustmentType,
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
    console.error('Plan adjustment error:', error);

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
        error: 'Failed to adjust training plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
