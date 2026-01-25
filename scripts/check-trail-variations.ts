import { prisma } from '../src/lib/db';

async function check() {
  const halfDomeTrails = await prisma.hike.findMany({
    where: {
      name: { contains: 'Half Dome' },
      parkName: 'Yosemite National Park',
    },
    select: {
      name: true,
      distanceMiles: true,
      elevationGainFt: true,
      routeType: true,
      avgRating: true,
      numReviews: true,
    },
  });

  console.log('\n🏔️ Half Dome Trail Variations:\n');
  halfDomeTrails.forEach((trail, i) => {
    console.log(`${i + 1}. ${trail.name}`);
    console.log(`   ${trail.distanceMiles.toFixed(1)} mi, ${trail.elevationGainFt} ft, ${trail.routeType}`);
    console.log(`   ⭐ ${trail.avgRating}/5 (${trail.numReviews} reviews)\n`);
  });

  await prisma.$disconnect();
}

check();
