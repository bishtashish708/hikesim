/**
 * Trail Enrichment Service
 * Combines OSM data with elevation profiles and additional metadata
 */

import { PrismaClient } from '@prisma/client';
import { fetchTrailsFromOSM, extractDifficulty, extractTrailType, extractSurface, delay, type OSMTrail, type TrailRegion } from './osm-fetcher';
import { generateElevationProfile, calculateDifficulty } from './elevation-service';

const prisma = new PrismaClient();

// Re-export TrailRegion for external use
export type { TrailRegion };

export type EnrichedTrail = {
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
  profilePoints: Array<{ distanceMiles: number; elevationFt: number }>;
  countryCode: string;
  stateCode: string | null;
  latitude: number;
  longitude: number;
  coordinates: [number, number][];
  difficulty: string;
  trailType: string;
  surface: string | null;
  city: string | null;
  parkName: string | null;
  region: string | null;
  sourceUrl: string;
  description: string | null;
};

/**
 * Fetch and enrich trails for a specific region
 */
export async function fetchAndEnrichTrails(
  region: TrailRegion,
  limit: number = 50
): Promise<EnrichedTrail[]> {
  console.log(`Fetching trails from OSM for ${region.country}${region.state ? `-${region.state}` : ''}...`);

  // Fetch raw trail data from OSM
  const osmTrails = await fetchTrailsFromOSM(region, limit);
  console.log(`Found ${osmTrails.length} trails from OSM`);

  const enrichedTrails: EnrichedTrail[] = [];

  for (let i = 0; i < osmTrails.length; i++) {
    const osmTrail = osmTrails[i];

    try {
      console.log(`[${i + 1}/${osmTrails.length}] Enriching: ${osmTrail.name}`);

      // Generate elevation profile
      const elevationProfile = await generateElevationProfile(osmTrail.coordinates, 50);

      // Calculate or extract metadata
      const distanceMiles = osmTrail.distance ? osmTrail.distance / 1609.34 : 0;
      const difficulty = extractDifficulty(osmTrail.tags) ||
        calculateDifficulty(distanceMiles, elevationProfile.totalElevationGainFt);

      const trailType = extractTrailType(osmTrail.tags) || 'Out & Back';
      const surface = extractSurface(osmTrail.tags);

      // Extract location metadata
      const parkName = osmTrail.tags.operator || osmTrail.tags['operator:type'] || null;
      const city = osmTrail.tags['addr:city'] || null;
      const regionName = region.region || null;

      enrichedTrails.push({
        name: osmTrail.name,
        distanceMiles,
        elevationGainFt: elevationProfile.totalElevationGainFt,
        profilePoints: elevationProfile.points,
        countryCode: region.country,
        stateCode: region.state || null,
        latitude: osmTrail.center[0],
        longitude: osmTrail.center[1],
        coordinates: osmTrail.coordinates,
        difficulty,
        trailType,
        surface,
        city,
        parkName,
        region: regionName,
        sourceUrl: osmTrail.id,
        description: osmTrail.tags.description || null,
      });

      // Rate limiting between trails
      if (i < osmTrails.length - 1) {
        await delay(1500); // 1.5s between trails
      }
    } catch (error) {
      console.error(`Failed to enrich trail ${osmTrail.name}:`, error);
      // Continue with next trail
    }
  }

  return enrichedTrails;
}

/**
 * Save enriched trails to database
 */
export async function saveTrailsToDatabase(trails: EnrichedTrail[]): Promise<number> {
  let savedCount = 0;

  for (const trail of trails) {
    try {
      await prisma.hike.create({
        data: {
          name: trail.name,
          distanceMiles: trail.distanceMiles,
          elevationGainFt: trail.elevationGainFt,
          profilePoints: trail.profilePoints,
          countryCode: trail.countryCode,
          stateCode: trail.stateCode,
          latitude: trail.latitude,
          longitude: trail.longitude,
          coordinates: trail.coordinates,
          difficulty: trail.difficulty,
          trailType: trail.trailType,
          surface: trail.surface,
          city: trail.city,
          parkName: trail.parkName,
          region: trail.region,
          sourceUrl: trail.sourceUrl,
          description: trail.description,
          lastEnriched: new Date(),
          isSeed: false,
        },
      });

      savedCount++;
      console.log(`✓ Saved: ${trail.name}`);
    } catch (error) {
      console.error(`Failed to save trail ${trail.name}:`, error);
    }
  }

  return savedCount;
}

/**
 * Enrich existing hikes in database with missing metadata
 */
export async function enrichExistingHikes(): Promise<number> {
  console.log('Enriching existing hikes with missing data...');

  // Find hikes missing enrichment data
  const hikesToEnrich = await prisma.hike.findMany({
    where: {
      OR: [
        { difficulty: null },
        { trailType: null },
        { latitude: null },
      ],
    },
  });

  console.log(`Found ${hikesToEnrich.length} hikes to enrich`);

  let enrichedCount = 0;

  for (const hike of hikesToEnrich) {
    try {
      // Calculate difficulty if missing
      const difficulty = hike.difficulty ||
        calculateDifficulty(hike.distanceMiles, hike.elevationGainFt);

      // Default trail type if missing
      const trailType = hike.trailType || 'Out & Back';

      // Calculate center coordinates if missing
      let latitude = hike.latitude;
      let longitude = hike.longitude;

      if (!latitude && Array.isArray(hike.profilePoints) && hike.profilePoints.length > 0) {
        // Use first elevation point as approximate trailhead
        latitude = 0; // Placeholder - would need reverse geocoding
        longitude = 0;
      }

      await prisma.hike.update({
        where: { id: hike.id },
        data: {
          difficulty,
          trailType,
          latitude,
          longitude,
          lastEnriched: new Date(),
        },
      });

      enrichedCount++;
      console.log(`✓ Enriched: ${hike.name}`);
    } catch (error) {
      console.error(`Failed to enrich hike ${hike.name}:`, error);
    }
  }

  return enrichedCount;
}

/**
 * Validate trail data quality
 */
export async function validateTrailData(): Promise<{
  total: number;
  withElevation: number;
  withDifficulty: number;
  withCoordinates: number;
  withType: number;
  qualityScore: number;
}> {
  const total = await prisma.hike.count();
  const withElevation = await prisma.hike.count({
    where: { elevationGainFt: { gt: 0 } },
  });
  const withDifficulty = await prisma.hike.count({
    where: { difficulty: { not: null } },
  });
  const withCoordinates = await prisma.hike.count({
    where: {
      AND: [
        { latitude: { not: null } },
        { longitude: { not: null } },
      ],
    },
  });
  const withType = await prisma.hike.count({
    where: { trailType: { not: null } },
  });

  const qualityScore = Math.round(
    ((withElevation + withDifficulty + withCoordinates + withType) / (total * 4)) * 100
  );

  return {
    total,
    withElevation,
    withDifficulty,
    withCoordinates,
    withType,
    qualityScore,
  };
}
