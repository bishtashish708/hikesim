import { prisma } from '../src/lib/db';

async function check() {
  const total = await prisma.hike.count({ where: { isSeed: false } });
  const withProfiles = await prisma.hike.count({
    where: {
      isSeed: false,
      profilePoints: { not: { equals: [] } },
    },
  });

  const parks = await prisma.hike.groupBy({
    by: ['parkName'],
    where: { isSeed: false },
    _count: true,
    orderBy: { _count: { parkName: 'desc' } },
  });

  console.log(`\n📊 Database Status:\n`);
  console.log(`Total Trails: ${total}`);
  console.log(`With Elevation Profiles: ${withProfiles} (${((withProfiles/total)*100).toFixed(1)}%)`);
  console.log(`\nTotal Parks: ${parks.length}`);
  console.log(`\nTop 20 Parks by Trail Count:\n`);

  parks.slice(0, 20).forEach((p, i) => {
    console.log(`${i+1}. ${p.parkName}: ${p._count} trails`);
  });

  await prisma.$disconnect();
}

check();
