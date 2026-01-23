import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ExperienceLevel, DifficultyPreference } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      experience,
      weeklyAvailability,
      goalHikeId,
      city,
      state,
      birthDate,
      preferredVolumeMinutes,
      preferredDifficulty,
      trainingVolumeLabel,
    } = body;

    // Validate experience level
    if (experience && !Object.values(ExperienceLevel).includes(experience)) {
      return NextResponse.json(
        { error: 'Invalid experience level' },
        { status: 400 }
      );
    }

    // Validate difficulty preference
    if (
      preferredDifficulty &&
      !Object.values(DifficultyPreference).includes(preferredDifficulty)
    ) {
      return NextResponse.json(
        { error: 'Invalid difficulty preference' },
        { status: 400 }
      );
    }

    // Create or update user profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        experience: experience || ExperienceLevel.BEGINNER,
        weeklyAvailability,
        goalHikeId,
        city,
        state,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
      update: {
        experience,
        weeklyAvailability,
        goalHikeId,
        city,
        state,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    // Create or update training preferences
    const preferences = await prisma.trainingPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        preferredVolumeMinutes,
        preferredDifficulty,
        trainingVolumeLabel,
      },
      update: {
        preferredVolumeMinutes,
        preferredDifficulty,
        trainingVolumeLabel,
      },
    });

    return NextResponse.json({
      success: true,
      profile,
      preferences,
    });
  } catch (error) {
    console.error('Error saving user profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: {
          include: {
            goalHike: true,
          },
        },
        preferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: user.profile,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
