import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedChallenges() {
  console.log('Seeding challenges and badges...');

  // Create challenge badges
  const challengeBadges = await Promise.all([
    prisma.badge.upsert({
      where: { id: 'badge-enchanted-valley' },
      update: {},
      create: {
        id: 'badge-enchanted-valley',
        name: 'Enchanted Valley Explorer',
        description: 'Completed the Olympic Enchanted Valley virtual challenge',
        iconName: 'ribbon',
        category: 'challenge',
        rarity: 'epic',
        points: 100,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-half-dome' },
      update: {},
      create: {
        id: 'badge-half-dome',
        name: 'Half Dome Conqueror',
        description: 'Completed the Half Dome virtual challenge',
        iconName: 'trophy',
        category: 'challenge',
        rarity: 'legendary',
        points: 150,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-appalachian-starter' },
      update: {},
      create: {
        id: 'badge-appalachian-starter',
        name: 'Appalachian Adventurer',
        description: 'Completed the Appalachian Trail Starter challenge',
        iconName: 'medal',
        category: 'challenge',
        rarity: 'rare',
        points: 75,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-everest-base' },
      update: {},
      create: {
        id: 'badge-everest-base',
        name: 'Everest Base Camp Virtual',
        description: 'Completed the virtual journey to Everest Base Camp',
        iconName: 'flag',
        category: 'challenge',
        rarity: 'legendary',
        points: 200,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-5k-starter' },
      update: {},
      create: {
        id: 'badge-5k-starter',
        name: '5K Trailblazer',
        description: 'Completed your first 5K hiking challenge',
        iconName: 'footsteps',
        category: 'challenge',
        rarity: 'common',
        points: 25,
      },
    }),
  ]);

  // Create streak badges
  const streakBadges = await Promise.all([
    prisma.badge.upsert({
      where: { id: 'badge-streak-3' },
      update: {},
      create: {
        id: 'badge-streak-3',
        name: 'Getting Started',
        description: '3 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'common',
        points: 15,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-streak-7' },
      update: {},
      create: {
        id: 'badge-streak-7',
        name: 'Week Warrior',
        description: '7 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'uncommon',
        points: 50,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-streak-14' },
      update: {},
      create: {
        id: 'badge-streak-14',
        name: 'Two Week Trek',
        description: '14 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'rare',
        points: 100,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-streak-30' },
      update: {},
      create: {
        id: 'badge-streak-30',
        name: 'Month of Miles',
        description: '30 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'epic',
        points: 250,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-streak-60' },
      update: {},
      create: {
        id: 'badge-streak-60',
        name: 'Trail Legend',
        description: '60 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'legendary',
        points: 500,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-streak-100' },
      update: {},
      create: {
        id: 'badge-streak-100',
        name: 'Century Strider',
        description: '100 consecutive days of hiking activity',
        iconName: 'flame',
        category: 'streak',
        rarity: 'legendary',
        points: 1000,
      },
    }),
  ]);

  // Create distance milestone badges
  const distanceBadges = await Promise.all([
    prisma.badge.upsert({
      where: { id: 'badge-distance-50' },
      update: {},
      create: {
        id: 'badge-distance-50',
        name: 'First 50',
        description: 'Logged 50 total miles',
        iconName: 'walk',
        category: 'distance',
        rarity: 'uncommon',
        points: 50,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-distance-100' },
      update: {},
      create: {
        id: 'badge-distance-100',
        name: 'Century Hiker',
        description: 'Logged 100 total miles',
        iconName: 'walk',
        category: 'distance',
        rarity: 'rare',
        points: 100,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-distance-250' },
      update: {},
      create: {
        id: 'badge-distance-250',
        name: 'Trail Blazer',
        description: 'Logged 250 total miles',
        iconName: 'walk',
        category: 'distance',
        rarity: 'epic',
        points: 250,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-distance-500' },
      update: {},
      create: {
        id: 'badge-distance-500',
        name: 'Mountain Master',
        description: 'Logged 500 total miles',
        iconName: 'walk',
        category: 'distance',
        rarity: 'legendary',
        points: 500,
      },
    }),
  ]);

  // Create elevation milestone badges
  const elevationBadges = await Promise.all([
    prisma.badge.upsert({
      where: { id: 'badge-elevation-10k' },
      update: {},
      create: {
        id: 'badge-elevation-10k',
        name: 'Climb Starter',
        description: 'Gained 10,000 ft of elevation',
        iconName: 'trending-up',
        category: 'elevation',
        rarity: 'uncommon',
        points: 50,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-elevation-29k' },
      update: {},
      create: {
        id: 'badge-elevation-29k',
        name: 'Virtual Everest',
        description: 'Gained 29,032 ft - the height of Mt. Everest',
        iconName: 'trending-up',
        category: 'elevation',
        rarity: 'epic',
        points: 300,
      },
    }),
    prisma.badge.upsert({
      where: { id: 'badge-elevation-100k' },
      update: {},
      create: {
        id: 'badge-elevation-100k',
        name: 'Elevation Elite',
        description: 'Gained 100,000 ft of total elevation',
        iconName: 'trending-up',
        category: 'elevation',
        rarity: 'legendary',
        points: 750,
      },
    }),
  ]);

  const badges = [...challengeBadges, ...streakBadges, ...distanceBadges, ...elevationBadges];

  console.log(`Created ${badges.length} badges`);

  // Create challenges
  const challenges = await Promise.all([
    // Beginner challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-5k-starter' },
      update: {},
      create: {
        id: 'challenge-5k-starter',
        name: '5K Trail Starter',
        description: 'Perfect for beginners! Walk or hike 5 kilometers (3.1 miles) at your own pace. A great first challenge to build your hiking habit.',
        totalDistanceMiles: 3.1,
        totalElevationGainFt: null,
        difficulty: 'EASY',
        estimatedDays: 3,
        maxDaysAllowed: 14,
        streakMode: 'FLEXIBLE',
        milestones: [
          { distanceMiles: 1, name: 'First Mile', description: 'You\'ve started your journey!' },
          { distanceMiles: 2, name: 'Halfway There', description: 'Keep going, you\'re doing great!' },
          { distanceMiles: 3.1, name: 'Finish Line', description: 'You completed the 5K!' },
        ],
        completionBadgeId: 'badge-5k-starter',
        completionPoints: 50,
        isActive: true,
        isFeatured: true,
      },
    }),

    // Moderate challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-appalachian-starter' },
      update: {},
      create: {
        id: 'challenge-appalachian-starter',
        name: 'Appalachian Trail Sampler',
        description: 'Experience a taste of the famous Appalachian Trail. Complete 25 miles of hiking to earn your badge. Hike anywhere - your local trails count!',
        totalDistanceMiles: 25,
        totalElevationGainFt: 5000,
        difficulty: 'MODERATE',
        estimatedDays: 10,
        maxDaysAllowed: 30,
        streakMode: 'GRACE_PERIOD',
        milestones: [
          { distanceMiles: 5, name: 'Trailhead', description: 'Your journey begins' },
          { distanceMiles: 12.5, name: 'Midway Shelter', description: 'Halfway to the finish!' },
          { distanceMiles: 20, name: 'Final Push', description: 'Almost there!' },
          { distanceMiles: 25, name: 'Trail Complete', description: 'You\'ve conquered the Appalachian Sampler!' },
        ],
        completionBadgeId: 'badge-appalachian-starter',
        completionPoints: 100,
        isActive: true,
        isFeatured: true,
      },
    }),

    // Hard challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-enchanted-valley' },
      update: {},
      create: {
        id: 'challenge-enchanted-valley',
        name: 'Olympic Enchanted Valley',
        description: 'Virtually hike the stunning Enchanted Valley in Olympic National Park. This 26-mile round trip takes you through old-growth forests to the famous Enchanted Valley chalet.',
        totalDistanceMiles: 26,
        totalElevationGainFt: 4500,
        difficulty: 'HARD',
        estimatedDays: 14,
        maxDaysAllowed: 45,
        streakMode: 'GRACE_PERIOD',
        milestones: [
          { distanceMiles: 5, name: 'Dosewallips Trailhead', description: 'Enter the wilderness' },
          { distanceMiles: 10, name: 'Anderson Pass Trail', description: 'Deep in the forest' },
          { distanceMiles: 13, name: 'Enchanted Valley Chalet', description: 'You\'ve reached the valley!' },
          { distanceMiles: 20, name: 'Return Journey', description: 'Heading home' },
          { distanceMiles: 26, name: 'Journey Complete', description: 'You\'ve experienced the Enchanted Valley!' },
        ],
        completionBadgeId: 'badge-enchanted-valley',
        completionPoints: 150,
        isActive: true,
        isFeatured: true,
      },
    }),

    // Very hard challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-half-dome' },
      update: {},
      create: {
        id: 'challenge-half-dome',
        name: 'Half Dome Summit',
        description: 'Tackle one of Yosemite\'s most iconic hikes virtually. This challenging 16-mile round trip with nearly 5,000 feet of elevation gain will test your limits.',
        totalDistanceMiles: 16,
        totalElevationGainFt: 4800,
        difficulty: 'HARD',
        estimatedDays: 10,
        maxDaysAllowed: 30,
        streakMode: 'GRACE_PERIOD',
        milestones: [
          { distanceMiles: 2, name: 'Vernal Fall Bridge', description: 'The mist begins' },
          { distanceMiles: 4, name: 'Nevada Fall', description: 'Powerful cascades' },
          { distanceMiles: 6, name: 'Little Yosemite Valley', description: 'Resting point' },
          { distanceMiles: 8, name: 'Half Dome Summit!', description: 'You made it to the top!' },
          { distanceMiles: 16, name: 'Back to Valley', description: 'Challenge complete!' },
        ],
        completionBadgeId: 'badge-half-dome',
        completionPoints: 175,
        isActive: true,
        isFeatured: false,
      },
    }),

    // Epic challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-everest-base' },
      update: {},
      create: {
        id: 'challenge-everest-base',
        name: 'Everest Base Camp Trek',
        description: 'The ultimate virtual hiking challenge! Trek the equivalent of the famous Everest Base Camp route. 80+ miles through the Himalayas - from anywhere in the world.',
        totalDistanceMiles: 82,
        totalElevationGainFt: 18000,
        difficulty: 'EXTREME',
        estimatedDays: 45,
        maxDaysAllowed: 90,
        streakMode: 'FLEXIBLE',
        milestones: [
          { distanceMiles: 10, name: 'Lukla', description: 'Journey begins at the famous airport' },
          { distanceMiles: 20, name: 'Namche Bazaar', description: 'Gateway to the Himalayas' },
          { distanceMiles: 35, name: 'Tengboche Monastery', description: 'Spiritual rest stop' },
          { distanceMiles: 50, name: 'Dingboche', description: 'Acclimatization point' },
          { distanceMiles: 65, name: 'Gorak Shep', description: 'Final push ahead' },
          { distanceMiles: 70, name: 'Everest Base Camp!', description: 'You\'ve reached the roof of the world!' },
          { distanceMiles: 82, name: 'Return to Lukla', description: 'Epic journey complete!' },
        ],
        completionBadgeId: 'badge-everest-base',
        completionPoints: 500,
        isActive: true,
        isFeatured: true,
      },
    }),

    // Quick daily challenge
    prisma.virtualChallenge.upsert({
      where: { id: 'challenge-daily-mile' },
      update: {},
      create: {
        id: 'challenge-daily-mile',
        name: '7-Day Mile Challenge',
        description: 'Build a daily hiking habit! Walk or hike at least 1 mile every day for 7 consecutive days. Perfect for establishing consistency.',
        totalDistanceMiles: 7,
        totalElevationGainFt: null,
        difficulty: 'EASY',
        estimatedDays: 7,
        maxDaysAllowed: 7,
        streakMode: 'STRICT',
        milestones: [
          { distanceMiles: 1, name: 'Day 1', description: 'First step taken!' },
          { distanceMiles: 3, name: 'Day 3', description: 'Building momentum' },
          { distanceMiles: 5, name: 'Day 5', description: 'Over the hump!' },
          { distanceMiles: 7, name: 'Day 7', description: 'Perfect week achieved!' },
        ],
        completionBadgeId: null,
        completionPoints: 70,
        isActive: true,
        isFeatured: false,
      },
    }),
  ]);

  console.log(`Created ${challenges.length} challenges`);
  console.log('Seeding complete!');
}

seedChallenges()
  .catch((e) => {
    console.error('Error seeding challenges:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
