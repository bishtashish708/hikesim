import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DifficultyPreference, ExperienceLevel } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  const preferences = await prisma.trainingPreferences.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ profile, preferences });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    profile?: {
      city?: string;
      state?: string;
      birthDate?: string;
      experience?: string;
      weeklyAvailability?: number[];
      goalHikeId?: string;
    };
    preferences?: {
      preferredVolumeMinutes?: number;
      preferredDifficulty?: string;
      trainingVolumeLabel?: string;
      crossTrainingPreferences?: string[];
    };
  };

  const profileData = body.profile ?? {};
  const preferencesData = body.preferences ?? {};
  const birthDate = profileData.birthDate ? new Date(profileData.birthDate) : null;
  const experience = parseExperienceLevel(profileData.experience);
  const preferredDifficulty = parseDifficultyPreference(preferencesData.preferredDifficulty);

  if (birthDate && Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "Birth date is invalid." }, { status: 400 });
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: {
      city: profileData.city?.trim() || null,
      state: profileData.state?.trim() || null,
      birthDate,
      weeklyAvailability: profileData.weeklyAvailability ?? null,
      goalHikeId: profileData.goalHikeId ?? null,
      ...(experience ? { experience } : {}),
    },
    create: {
      userId: session.user.id,
      city: profileData.city?.trim() || null,
      state: profileData.state?.trim() || null,
      birthDate,
      weeklyAvailability: profileData.weeklyAvailability ?? null,
      goalHikeId: profileData.goalHikeId ?? null,
      ...(experience ? { experience } : {}),
    },
  });

  const preferences = await prisma.trainingPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      preferredVolumeMinutes: preferencesData.preferredVolumeMinutes ?? null,
      preferredDifficulty: preferredDifficulty ?? null,
      trainingVolumeLabel: preferencesData.trainingVolumeLabel?.trim() || null,
      crossTrainingPreferences: preferencesData.crossTrainingPreferences ?? null,
    },
    create: {
      userId: session.user.id,
      preferredVolumeMinutes: preferencesData.preferredVolumeMinutes ?? null,
      preferredDifficulty: preferredDifficulty ?? null,
      trainingVolumeLabel: preferencesData.trainingVolumeLabel?.trim() || null,
      crossTrainingPreferences: preferencesData.crossTrainingPreferences ?? null,
    },
  });

  return NextResponse.json({ profile, preferences });
}

function parseExperienceLevel(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "BEGINNER") return ExperienceLevel.BEGINNER;
  if (normalized === "INTERMEDIATE") return ExperienceLevel.INTERMEDIATE;
  if (normalized === "ADVANCED") return ExperienceLevel.ADVANCED;
  return null;
}

function parseDifficultyPreference(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "EASY") return DifficultyPreference.EASY;
  if (normalized === "MODERATE") return DifficultyPreference.MODERATE;
  if (normalized === "STRENUOUS") return DifficultyPreference.STRENUOUS;
  return null;
}
