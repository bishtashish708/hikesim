import { NPSClient } from '../src/agents/trail-collector/nps-client';

async function test() {
  console.log('Testing NPS API...');
  
  if (!process.env.NPS_API_KEY) {
    console.error('Error: NPS_API_KEY not found in .env');
    console.log('Get your free key at: https://www.nps.gov/subjects/developer/get-started.htm');
    process.exit(1);
  }

  const client = new NPSClient();
  const connected = await client.testConnection();
  
  if (!connected) {
    console.error('Failed to connect to NPS API');
    process.exit(1);
  }

  console.log('Connected! Fetching Yosemite trails...');
  const trails = await client.fetchThingsToDo('yose');
  
  console.log(`Found ${trails.length} trails`);
  trails.slice(0, 3).forEach((t, idx) => {
    console.log(`${idx + 1}. ${t.name}`);
  });
}

test().catch(console.error);
