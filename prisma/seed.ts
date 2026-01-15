import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const seedHikes = [
  { name: "Quandary Peak", distanceMiles: 6.6, elevationGainFt: 3450, countryCode: "US", stateCode: "CO" },
  { name: "Angel's Landing", distanceMiles: 5.4, elevationGainFt: 1500, countryCode: "US", stateCode: "UT" },
  { name: "Emerald Lake Trail", distanceMiles: 3.6, elevationGainFt: 700, countryCode: "US", stateCode: "CO" },
  { name: "Mount LeConte via Alum Cave", distanceMiles: 11.0, elevationGainFt: 2800, countryCode: "US", stateCode: "TN" },
  { name: "Mist Trail to Nevada Fall", distanceMiles: 7.0, elevationGainFt: 2200, countryCode: "US", stateCode: "CA" },
  { name: "Franconia Ridge Loop", distanceMiles: 8.9, elevationGainFt: 3900, countryCode: "US", stateCode: "NH" },
  { name: "Cascade Mountain", distanceMiles: 4.8, elevationGainFt: 2000, countryCode: "US", stateCode: "NY" },
  { name: "Rattlesnake Ledge", distanceMiles: 4.0, elevationGainFt: 1160, countryCode: "US", stateCode: "WA" },
  { name: "Grinnell Glacier Overlook", distanceMiles: 10.6, elevationGainFt: 3500, countryCode: "US", stateCode: "MT" },
];

type ElevationPoint = {
  distanceMiles: number;
  elevationFt: number;
};

function buildProfile(distanceMiles: number, elevationGainFt: number, points = 20) {
  const startElevation = 4800 + Math.round(elevationGainFt * 0.15);
  const result: ElevationPoint[] = [];

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
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed script should not run in production.");
  }

  await prisma.generatedPlan.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.hike.deleteMany({ where: { isSeed: true } });
  await prisma.hike.deleteMany({
    where: {
      isSeed: false,
      countryCode: { in: ["US", "IN"] },
    },
  });

  await Promise.all(
    seedHikes.map((hike) =>
      prisma.hike.create({
        data: {
          name: hike.name,
          distanceMiles: hike.distanceMiles,
          elevationGainFt: hike.elevationGainFt,
          countryCode: hike.countryCode,
          stateCode: hike.stateCode,
          profilePoints: buildProfile(hike.distanceMiles, hike.elevationGainFt),
          isSeed: true,
        },
      })
    )
  );

  const preloadPath = path.resolve(process.cwd(), "data/trails/preloaded.json");
  try {
    const preloadRaw = await fs.readFile(preloadPath, "utf-8");
    const preload = JSON.parse(preloadRaw) as {
      hikes?: Array<{
        name: string;
        distanceMiles: number;
        elevationGainFt: number;
        countryCode: string;
        stateCode?: string | null;
      }>;
    };
    if (Array.isArray(preload.hikes)) {
      for (const hike of preload.hikes) {
        const existing = await prisma.hike.findFirst({
          where: {
            name: hike.name,
            countryCode: hike.countryCode,
            stateCode: hike.stateCode ?? null,
          },
          select: { id: true },
        });
        if (existing) continue;
        await prisma.hike.create({
          data: {
            name: hike.name,
            distanceMiles: hike.distanceMiles,
            elevationGainFt: hike.elevationGainFt,
            countryCode: hike.countryCode,
            stateCode: hike.stateCode ?? null,
            profilePoints: buildProfile(hike.distanceMiles, hike.elevationGainFt),
            isSeed: false,
          },
        });
      }
    }
  } catch (error) {
    console.warn("No preloaded trail dataset found. Skipping.");
  }

  const demoEmail = "demo@hikesim.com";
  const demoPassword = "password123";
  const demoPasswordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Demo User",
      passwordHash: demoPasswordHash,
    },
    create: {
      name: "Demo User",
      email: demoEmail,
      passwordHash: demoPasswordHash,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
