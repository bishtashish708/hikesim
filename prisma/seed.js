const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seedHikes = [
  { name: "Quandary Peak", distanceMiles: 6.6, elevationGainFt: 3450 },
  { name: "Angel's Landing", distanceMiles: 5.4, elevationGainFt: 1500 },
  { name: "Emerald Lake Trail", distanceMiles: 3.6, elevationGainFt: 700 },
  { name: "Mount LeConte via Alum Cave", distanceMiles: 11.0, elevationGainFt: 2800 },
  { name: "Mist Trail to Nevada Fall", distanceMiles: 7.0, elevationGainFt: 2200 },
  { name: "Franconia Ridge Loop", distanceMiles: 8.9, elevationGainFt: 3900 },
  { name: "Cascade Mountain", distanceMiles: 4.8, elevationGainFt: 2000 },
  { name: "Rattlesnake Ledge", distanceMiles: 4.0, elevationGainFt: 1160 },
  { name: "Grinnell Glacier Overlook", distanceMiles: 10.6, elevationGainFt: 3500 },
];

function buildProfile(distanceMiles, elevationGainFt, points = 20) {
  const startElevation = 4800 + Math.round(elevationGainFt * 0.15);
  const result = [];

  for (let i = 0; i < points; i += 1) {
    const progress = i / (points - 1);
    const trend = startElevation + elevationGainFt * progress;
    const wiggle = Math.sin(progress * Math.PI * 3) * elevationGainFt * 0.08;
    const dip = Math.sin(progress * Math.PI * 7) * elevationGainFt * 0.03;
    const elevation = Math.round(trend + wiggle + dip);
    const distance = Number((distanceMiles * progress).toFixed(2));

    result.push({
      distanceMiles: distance,
      elevationFt: elevation,
    });
  }

  return result;
}

async function main() {
  await prisma.generatedPlan.deleteMany();
  await prisma.hike.deleteMany({ where: { isSeed: true } });

  for (const hike of seedHikes) {
    await prisma.hike.create({
      data: {
        name: hike.name,
        distanceMiles: hike.distanceMiles,
        elevationGainFt: hike.elevationGainFt,
        profilePoints: buildProfile(hike.distanceMiles, hike.elevationGainFt),
        isSeed: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
