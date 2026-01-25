/**
 * Test NPS API connection
 */

import { NPSClient } from '../src/agents/collector/nps-client';

async function main() {
  const apiKey = process.env.NPS_API_KEY;

  if (!apiKey) {
    console.error('❌ NPS_API_KEY not set');
    process.exit(1);
  }

  console.log('\n🧪 Testing NPS API Connection\n');

  const client = new NPSClient(apiKey);

  try {
    console.log('📡 Fetching trails for Yosemite (yose)...');

    const response = await client.fetchTrailsForPark('yose');

    console.log(`✅ Found ${response.data.length} trails!`);
    console.log(`\n📊 Sample trails:`);

    response.data.slice(0, 5).forEach((trail, i) => {
      console.log(`\n   ${i + 1}. ${trail.title}`);
      console.log(`      URL: ${trail.url}`);
      console.log(`      Location: ${trail.latLong || 'No coordinates'}`);
      console.log(`      Activities: ${trail.activities?.map(a => a.name).join(', ') || 'None'}`);
    });

    console.log('\n✅ NPS API is working correctly!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
