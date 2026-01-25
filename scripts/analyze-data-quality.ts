import { prisma } from '../src/lib/db';

async function analyzeDataQuality() {
  const totalHikes = await prisma.hike.count({ where: { isSeed: false } });

  const zeroElevation = await prisma.hike.count({
    where: { elevationGainFt: 0, isSeed: false }
  });

  const lowElevation = await prisma.hike.count({
    where: { elevationGainFt: { lt: 100 }, isSeed: false }
  });

  const shortDistance = await prisma.hike.count({
    where: { distanceMiles: { lt: 1 }, isSeed: false }
  });

  const veryShort = await prisma.hike.count({
    where: { distanceMiles: { lt: 0.5 }, isSeed: false }
  });

  console.log('\n📊 Data Quality Analysis:');
  console.log(`Total trails: ${totalHikes}`);
  console.log(`\n🚨 Quality Issues:`);
  console.log(`- Zero elevation gain: ${zeroElevation} (${(zeroElevation/totalHikes*100).toFixed(1)}%)`);
  console.log(`- Low elevation (<100ft): ${lowElevation} (${(lowElevation/totalHikes*100).toFixed(1)}%)`);
  console.log(`- Short distance (<1mi): ${shortDistance} (${(shortDistance/totalHikes*100).toFixed(1)}%)`);
  console.log(`- Very short (<0.5mi): ${veryShort} (${(veryShort/totalHikes*100).toFixed(1)}%)`);

  const problematic = await prisma.hike.findMany({
    where: {
      isSeed: false,
      OR: [
        { elevationGainFt: 0 },
        { distanceMiles: { lt: 0.5 } }
      ]
    },
    select: {
      name: true,
      parkName: true,
      distanceMiles: true,
      elevationGainFt: true,
    },
    take: 15
  });

  console.log('\n📋 Sample problematic trails:');
  problematic.forEach(h => {
    console.log(`  ${h.name} (${h.parkName}): ${h.distanceMiles}mi, ${h.elevationGainFt}ft`);
  });

  // Check good trails
  const goodTrails = await prisma.hike.findMany({
    where: {
      isSeed: false,
      elevationGainFt: { gt: 500 },
      distanceMiles: { gt: 2 }
    },
    select: {
      name: true,
      parkName: true,
      distanceMiles: true,
      elevationGainFt: true,
    },
    take: 10
  });

  const goodCount = await prisma.hike.count({
    where: {
      isSeed: false,
      elevationGainFt: { gt: 500 },
      distanceMiles: { gt: 2 }
    }
  });

  console.log(`\n✅ Quality trails (>2mi, >500ft): ${goodCount} (${(goodCount/totalHikes*100).toFixed(1)}%)`);
  console.log('\n📋 Sample quality trails:');
  goodTrails.forEach(h => {
    console.log(`  ${h.name} (${h.parkName}): ${h.distanceMiles.toFixed(1)}mi, ${h.elevationGainFt}ft`);
  });

  await prisma.$disconnect();
}

analyzeDataQuality();
