/**
 * Background script to enrich hike images using OpenRouter/Perplexity
 *
 * Usage:
 *   npx tsx scripts/enrich-hike-images.ts [options]
 *
 * Options:
 *   --batch-size=N     Number of hikes to process per batch (default: 10)
 *   --country=CODE     Only process hikes from specific country (US or IN)
 *   --max-batches=N    Maximum number of batches to run (default: unlimited)
 *   --delay=N          Delay between batches in seconds (default: 5)
 *   --dry-run          Show what would be processed without making changes
 */

import { PrismaClient } from '@prisma/client';
import { searchHikeImages, getPlaceholderImages, estimateCost, type HikeInfo } from '../src/lib/imageEnrichment';

const prisma = new PrismaClient();

interface ScriptOptions {
  batchSize: number;
  countryCode?: string;
  maxBatches?: number;
  delaySeconds: number;
  dryRun: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    batchSize: 10,
    delaySeconds: 5,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--country=')) {
      options.countryCode = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--max-batches=')) {
      options.maxBatches = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--delay=')) {
      options.delaySeconds = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processHike(hike: HikeInfo & { id: string }, dryRun: boolean): Promise<{
  success: boolean;
  imageCount: number;
  usedPlaceholder: boolean;
  error?: string;
}> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would process: ${hike.name}`);
    return { success: true, imageCount: 0, usedPlaceholder: false };
  }

  try {
    // Try to get real images
    let imageResult = await searchHikeImages(hike);
    let usedPlaceholder = false;

    // Fall back to placeholders if no images found
    if (imageResult.images.length === 0) {
      imageResult = getPlaceholderImages(hike);
      usedPlaceholder = true;
    }

    // Update the database
    await prisma.hike.update({
      where: { id: hike.id },
      data: {
        primaryImageUrl: imageResult.primaryImageUrl,
        images: imageResult.images,
        imagesEnrichedAt: new Date(),
      },
    });

    return {
      success: true,
      imageCount: imageResult.images.length,
      usedPlaceholder,
    };
  } catch (error) {
    return {
      success: false,
      imageCount: 0,
      usedPlaceholder: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  const options = parseArgs();

  console.log('🥾 Hike Image Enrichment Script');
  console.log('================================');
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Country filter: ${options.countryCode || 'All'}`);
  console.log(`Max batches: ${options.maxBatches || 'Unlimited'}`);
  console.log(`Delay between batches: ${options.delaySeconds}s`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log('');

  // Get counts
  const whereClause: { countryCode?: string; imagesEnrichedAt?: null } = {
    imagesEnrichedAt: null,
  };
  if (options.countryCode) {
    whereClause.countryCode = options.countryCode;
  }

  const pendingCount = await prisma.hike.count({ where: whereClause });
  const costEstimate = estimateCost(pendingCount);

  console.log(`📊 Status:`);
  console.log(`   Hikes pending enrichment: ${pendingCount}`);
  console.log(`   Estimated cost: ${costEstimate.estimatedCost}`);
  console.log(`   Model: ${costEstimate.model}`);
  console.log('');

  if (pendingCount === 0) {
    console.log('✅ All hikes have been enriched!');
    return;
  }

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }

  let batchNumber = 0;
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalPlaceholders = 0;

  while (true) {
    batchNumber++;

    if (options.maxBatches && batchNumber > options.maxBatches) {
      console.log(`\n⏹️  Reached max batches limit (${options.maxBatches})`);
      break;
    }

    // Fetch next batch
    const hikes = await prisma.hike.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        parkName: true,
        stateCode: true,
        countryCode: true,
        city: true,
        region: true,
      },
      take: options.batchSize,
      orderBy: { createdAt: 'asc' },
    });

    if (hikes.length === 0) {
      console.log('\n✅ All hikes have been processed!');
      break;
    }

    console.log(`\n📦 Batch ${batchNumber} (${hikes.length} hikes)`);
    console.log('-'.repeat(40));

    for (const hike of hikes) {
      const result = await processHike(hike, options.dryRun);
      totalProcessed++;

      if (result.success) {
        totalSuccessful++;
        if (result.usedPlaceholder) {
          totalPlaceholders++;
          console.log(`  ⚠️  ${hike.name} - placeholder (no images found)`);
        } else {
          console.log(`  ✅ ${hike.name} - ${result.imageCount} images`);
        }
      } else {
        totalFailed++;
        console.log(`  ❌ ${hike.name} - ${result.error}`);
      }

      // Small delay between API calls
      if (!options.dryRun) {
        await sleep(500);
      }
    }

    // Delay between batches
    if (hikes.length === options.batchSize && !options.dryRun) {
      console.log(`\n⏳ Waiting ${options.delaySeconds}s before next batch...`);
      await sleep(options.delaySeconds * 1000);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(40));
  console.log('📈 Final Summary');
  console.log('='.repeat(40));
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Successful: ${totalSuccessful}`);
  console.log(`Used placeholders: ${totalPlaceholders}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success rate: ${totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0}%`);
}

main()
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
