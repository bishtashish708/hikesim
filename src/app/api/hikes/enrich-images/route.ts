import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchHikeImages, getPlaceholderImages, estimateCost } from "@/lib/imageEnrichment";

// POST - Enrich images for hikes (batch processing)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const batchSize = parseInt(searchParams.get('batchSize') || '10');
  const countryCode = searchParams.get('countryCode') || undefined;
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  // Find hikes that need image enrichment
  const whereClause: {
    countryCode?: string;
    imagesEnrichedAt?: null | { lt: Date };
  } = {};

  if (countryCode) {
    whereClause.countryCode = countryCode;
  }

  if (!forceRefresh) {
    // Only get hikes that haven't been enriched or were enriched more than 30 days ago
    whereClause.imagesEnrichedAt = null;
  }

  const hikes = await prisma.hike.findMany({
    where: forceRefresh ? (countryCode ? { countryCode } : {}) : whereClause,
    select: {
      id: true,
      name: true,
      parkName: true,
      stateCode: true,
      countryCode: true,
      city: true,
      region: true,
      imagesEnrichedAt: true,
    },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  if (hikes.length === 0) {
    return NextResponse.json({
      message: 'No hikes need enrichment',
      processed: 0,
    });
  }

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    usedPlaceholder: 0,
    details: [] as { hikeId: string; hikeName: string; status: string; imageCount: number }[],
  };

  for (const hike of hikes) {
    try {
      // Try to get real images first
      let imageResult = await searchHikeImages({
        name: hike.name,
        parkName: hike.parkName,
        stateCode: hike.stateCode,
        countryCode: hike.countryCode,
        city: hike.city,
        region: hike.region,
      });

      // If no images found, use placeholders
      if (imageResult.images.length === 0) {
        imageResult = getPlaceholderImages({
          name: hike.name,
          parkName: hike.parkName,
          countryCode: hike.countryCode,
        });
        results.usedPlaceholder++;
      }

      // Update the hike with images
      await prisma.hike.update({
        where: { id: hike.id },
        data: {
          primaryImageUrl: imageResult.primaryImageUrl,
          images: imageResult.images,
          imagesEnrichedAt: new Date(),
        },
      });

      results.successful++;
      results.details.push({
        hikeId: hike.id,
        hikeName: hike.name,
        status: imageResult.images.length > 0 ? 'success' : 'placeholder',
        imageCount: imageResult.images.length,
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        hikeId: hike.id,
        hikeName: hike.name,
        status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageCount: 0,
      });
    }

    results.processed++;

    // Add a small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return NextResponse.json({
    message: `Processed ${results.processed} hikes`,
    ...results,
  });
}

// GET - Check enrichment status and estimate costs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get('countryCode') || undefined;

  const whereClause: { countryCode?: string } = {};
  if (countryCode) {
    whereClause.countryCode = countryCode;
  }

  const [totalHikes, enrichedHikes, pendingHikes] = await Promise.all([
    prisma.hike.count({ where: whereClause }),
    prisma.hike.count({
      where: { ...whereClause, imagesEnrichedAt: { not: null } },
    }),
    prisma.hike.count({
      where: { ...whereClause, imagesEnrichedAt: null },
    }),
  ]);

  const costEstimate = estimateCost(pendingHikes);

  return NextResponse.json({
    total: totalHikes,
    enriched: enrichedHikes,
    pending: pendingHikes,
    percentComplete: totalHikes > 0 ? Math.round((enrichedHikes / totalHikes) * 100) : 0,
    costEstimate: {
      ...costEstimate,
      note: 'Cost is approximate based on average token usage',
    },
  });
}
