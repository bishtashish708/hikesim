/**
 * Full Trail Collection Pipeline
 * Orchestrates: Collector → Verifier → Validator
 *
 * Run: npx tsx scripts/run-full-pipeline.ts <parkCode>
 * Example: npx tsx scripts/run-full-pipeline.ts yose
 */

import 'dotenv/config';
import { TrailCollectorAgent } from '../src/agents/trail-collector/collector-agent';
import { TrailVerifierAgent } from '../src/agents/trail-verifier/verifier-agent';
import { TrailValidatorAgent } from '../src/agents/trail-validator/validator-agent';
import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runPipeline(parkCode: string) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 TRAIL COLLECTION PIPELINE');
  console.log('='.repeat(80));
  console.log(`\nPark Code: ${parkCode}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  console.log('Pipeline Steps:');
  console.log('  1. COLLECTOR: Gather data from NPS API + Web Scraping');
  console.log('  2. VERIFIER: Enrich with OpenTopography elevation data');
  console.log('  3. VALIDATOR: Apply quality checks + Insert to database\n');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    // Step 1: Collect
    console.log('📡 STEP 1: COLLECTING TRAILS\n');
    const collector = new TrailCollectorAgent();
    const rawTrails = await collector.collectTrailsForPark(parkCode);

    if (rawTrails.length === 0) {
      console.log('⚠️  No trails collected. Stopping pipeline.\n');
      return;
    }

    // Step 2: Verify
    console.log('\n📋 STEP 2: VERIFYING & ENRICHING TRAILS\n');
    const verifier = new TrailVerifierAgent();
    const verifiedTrails = await verifier.verifyTrails(rawTrails);

    // Step 3: Validate and Insert
    console.log('\n🔍 STEP 3: VALIDATING & INSERTING TRAILS\n');
    const validator = new TrailValidatorAgent();

    // Get park name from verified trails
    const parkName = verifiedTrails[0]?.parkName || parkCode;

    const report = await validator.validateAndInsertTrails(
      verifiedTrails,
      parkCode,
      parkName
    );

    // Save report
    const reportsDir = 'data/logs';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(
      reportsDir,
      `pipeline-${parkCode}-${Date.now()}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Final summary
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('✅ PIPELINE COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📊 Final Summary:`);
    console.log(`   Park: ${parkName}`);
    console.log(`   Total Collected: ${report.totalCollected}`);
    console.log(`   Total Verified: ${report.totalVerified}`);
    console.log(`   Total Validated: ${report.totalValidated}`);
    console.log(`   Total Inserted: ${report.totalInserted}`);
    console.log(`   Total Rejected: ${report.totalCollected - report.totalInserted}`);
    console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📄 Report: ${reportPath}\n`);
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get park code from command line
const parkCode = process.argv[2];

if (!parkCode) {
  console.error('Usage: npx tsx scripts/run-full-pipeline.ts <parkCode>');
  console.error('Example: npx tsx scripts/run-full-pipeline.ts yose');
  console.error('\nAvailable park codes:');
  console.error('  yose - Yosemite');
  console.error('  grca - Grand Canyon');
  console.error('  zion - Zion');
  console.error('  romo - Rocky Mountain');
  console.error('  olym - Olympic');
  console.error('  grte - Grand Teton');
  console.error('  yell - Yellowstone');
  console.error('  glac - Glacier');
  console.error('  acad - Acadia');
  console.error('  grsm - Great Smoky Mountains\n');
  process.exit(1);
}

runPipeline(parkCode).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
