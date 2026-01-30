/**
 * Badge Awarding Service
 * Automatically checks and awards badges based on user achievements
 */

import { prisma } from '@/lib/db';

interface AwardedBadge {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
  category: string;
  rarity: string;
  points: number;
  awardedAt: Date;
}

interface BadgeCheckResult {
  newBadges: AwardedBadge[];
  existingBadges: string[];
}

// Badge thresholds
const STREAK_THRESHOLDS = [
  { days: 3, badgeId: 'badge-streak-3' },
  { days: 7, badgeId: 'badge-streak-7' },
  { days: 14, badgeId: 'badge-streak-14' },
  { days: 30, badgeId: 'badge-streak-30' },
  { days: 60, badgeId: 'badge-streak-60' },
  { days: 100, badgeId: 'badge-streak-100' },
];

const DISTANCE_THRESHOLDS = [
  { miles: 50, badgeId: 'badge-distance-50' },
  { miles: 100, badgeId: 'badge-distance-100' },
  { miles: 250, badgeId: 'badge-distance-250' },
  { miles: 500, badgeId: 'badge-distance-500' },
];

const ELEVATION_THRESHOLDS = [
  { feet: 10000, badgeId: 'badge-elevation-10k' },
  { feet: 29032, badgeId: 'badge-elevation-29k' },
  { feet: 100000, badgeId: 'badge-elevation-100k' },
];

export async function checkAndAwardBadges(userId: string): Promise<BadgeCheckResult> {
  const newBadges: AwardedBadge[] = [];
  const existingBadges: string[] = [];

  // Get user's current badges
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const userBadgeIds = new Set(userBadges.map(b => b.badgeId));

  // Check streak badges
  const streakBadgesToAward = await checkStreakBadges(userId, userBadgeIds);

  // Check distance badges
  const distanceBadgesToAward = await checkDistanceBadges(userId, userBadgeIds);

  // Check elevation badges
  const elevationBadgesToAward = await checkElevationBadges(userId, userBadgeIds);

  const allBadgesToAward = [
    ...streakBadgesToAward,
    ...distanceBadgesToAward,
    ...elevationBadgesToAward,
  ];

  // Award new badges
  for (const badgeId of allBadgesToAward) {
    try {
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
      });

      if (!badge) continue;

      // Check if badge already awarded (in case of race condition)
      const existing = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: { userId, badgeId },
        },
      });

      if (existing) {
        existingBadges.push(badgeId);
        continue;
      }

      // Award the badge
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId,
        },
      });

      newBadges.push({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        iconName: badge.iconName,
        category: badge.category,
        rarity: badge.rarity,
        points: badge.points,
        awardedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error awarding badge ${badgeId}:`, error);
    }
  }

  return { newBadges, existingBadges };
}

async function checkStreakBadges(userId: string, existingBadgeIds: Set<string>): Promise<string[]> {
  const badgesToAward: string[] = [];

  // Get user's longest streak from challenge progress
  const maxStreak = await prisma.userChallengeProgress.aggregate({
    where: { userId },
    _max: { longestStreak: true },
  });

  const longestStreak = maxStreak._max.longestStreak || 0;

  for (const threshold of STREAK_THRESHOLDS) {
    if (longestStreak >= threshold.days && !existingBadgeIds.has(threshold.badgeId)) {
      badgesToAward.push(threshold.badgeId);
    }
  }

  return badgesToAward;
}

async function checkDistanceBadges(userId: string, existingBadgeIds: Set<string>): Promise<string[]> {
  const badgesToAward: string[] = [];

  // Get total distance from workouts
  const totalDistance = await prisma.workout.aggregate({
    where: { userId },
    _sum: { distanceMiles: true },
  });

  const totalMiles = totalDistance._sum.distanceMiles || 0;

  for (const threshold of DISTANCE_THRESHOLDS) {
    if (totalMiles >= threshold.miles && !existingBadgeIds.has(threshold.badgeId)) {
      badgesToAward.push(threshold.badgeId);
    }
  }

  return badgesToAward;
}

async function checkElevationBadges(userId: string, existingBadgeIds: Set<string>): Promise<string[]> {
  const badgesToAward: string[] = [];

  // Get total elevation from workouts
  const totalElevation = await prisma.workout.aggregate({
    where: { userId },
    _sum: { elevationGainFt: true },
  });

  const totalFeet = totalElevation._sum.elevationGainFt || 0;

  for (const threshold of ELEVATION_THRESHOLDS) {
    if (totalFeet >= threshold.feet && !existingBadgeIds.has(threshold.badgeId)) {
      badgesToAward.push(threshold.badgeId);
    }
  }

  return badgesToAward;
}

export async function getUserBadges(userId: string) {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: { earnedAt: 'desc' },
  });

  return userBadges.map(ub => ({
    ...ub.badge,
    earnedAt: ub.earnedAt,
  }));
}

export async function getUserStats(userId: string) {
  const [workoutStats, challengeStats, badgeCount] = await Promise.all([
    prisma.workout.aggregate({
      where: { userId },
      _sum: {
        distanceMiles: true,
        elevationGainFt: true,
        durationMinutes: true,
      },
      _count: { id: true },
    }),
    prisma.userChallengeProgress.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { pointsEarned: true },
      _max: { longestStreak: true },
    }),
    prisma.userBadge.count({ where: { userId } }),
  ]);

  const completedChallenges = await prisma.userChallengeProgress.count({
    where: { userId, status: 'COMPLETED' },
  });

  return {
    totalDistance: Math.round((workoutStats._sum.distanceMiles || 0) * 10) / 10,
    totalElevation: Math.round(workoutStats._sum.elevationGainFt || 0),
    totalWorkouts: workoutStats._count.id,
    totalDuration: Math.round(workoutStats._sum.durationMinutes || 0),
    totalPoints: challengeStats._sum.pointsEarned || 0,
    longestStreak: challengeStats._max.longestStreak || 0,
    challengesJoined: challengeStats._count.id,
    challengesCompleted: completedChallenges,
    badgesEarned: badgeCount,
  };
}
