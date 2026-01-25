/**
 * Test the Trail Collector Agent on Yosemite
 * Run: npx tsx scripts/test-collector.ts
 */

import 'dotenv/config';
import { TrailCollectorAgent } from '../src/agents/trail-collector/collector-agent';

async function testCollector() {
  console.log('\n🧪 Testing Trail Collector Agent\n');
  console.log('This will collect trails from Yosemite using FREE sources:');
  console.log('  1. NPS API (official data)');
  console.log('  2. NPS Website Scraping (detailed info)');
  console.log('  3. No Google Maps (saving $11)\n');

  const collector = new TrailCollectorAgent();

  // Test connections first
  console.log('Step 1: Testing connections...');
  const connections = await collector.testConnections();

  if (!connections.nps) {
    console.error('\n❌ NPS API connection failed!');
    console.log('Make sure NPS_API_KEY is in your .env file\n');
    process.exit(1);
  }

  console.log('\n✅ All connections successful!\n');

  // Collect trails for Yosemite
  console.log('Step 2: Collecting Yosemite trails...\n');

  const trails = await collector.collectTrailsForPark('yose');

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`\nTotal trails collected: ${trails.length}`);

  if (trails.length > 0) {
    console.log('\n📋 Sample trails:\n');

    trails.slice(0, 10).forEach((trail, idx) => {
      console.log(`${idx + 1}. ${trail.name}`);
      console.log(`   Source: ${trail.source}`);
      console.log(`   Distance: ${trail.distanceMiles ? trail.distanceMiles + ' mi' : 'Unknown'}`);
      console.log(`   Elevation: ${trail.elevationGainFt ? trail.elevationGainFt + ' ft' : 'Unknown'}`);
      console.log(`   Confidence: ${trail.confidence}%`);
      console.log('');
    });

    // Analyze data quality
    const withDistance = trails.filter((t) => t.distanceMiles).length;
    const withElevation = trails.filter((t) => t.elevationGainFt).length;
    const withCoords = trails.filter((t) => t.coordinates && t.coordinates.length > 0).length;

    console.log('📈 Data Quality:');
    console.log(`   Trails with distance: ${withDistance}/${trails.length} (${((withDistance / trails.length) * 100).toFixed(1)}%)`);
    console.log(`   Trails with elevation: ${withElevation}/${trails.length} (${((withElevation / trails.length) * 100).toFixed(1)}%)`);
    console.log(`   Trails with coordinates: ${withCoords}/${trails.length} (${((withCoords / trails.length) * 100).toFixed(1)}%)`);

    console.log('\n💡 Next Steps:');
    console.log('   1. Verifier Agent will cross-reference this data');
    console.log('   2. Validator Agent will apply quality filters (10mi+ out-and-back, 500ft+ elevation)');
    console.log('   3. High-quality trails will be inserted into database\n');
  } else {
    console.log('\n⚠️  No trails collected. This might mean:');
    console.log('   1. NPS API returned no results for this park');
    console.log('   2. Web scraping failed (HTML structure changed)');
    console.log('   3. Network connectivity issues\n');
  }

  console.log('✅ Test complete!\n');
}

// Run test
testCollector().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
