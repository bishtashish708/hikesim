/**
 * Test OpenRouter API connection
 */

import { OpenRouterClient } from '../src/agents/base/openrouter-client';

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  console.log('\n🧪 Testing OpenRouter API Connection\n');

  const client = new OpenRouterClient(apiKey);

  try {
    console.log('📡 Testing simple JSON response...');

    const { data, cost } = await client.chatJSON<{ trails: Array<{ name: string }> }>([
      {
        role: 'system',
        content: 'You are a helpful assistant. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: 'Return a JSON object with a "trails" array containing 2 simple trail names. Example format: {"trails": [{"name": "Test Trail 1"}, {"name": "Test Trail 2"}]}'
      }
    ], 'openai/gpt-4o-mini', { temperature: 0.1, maxTokens: 200 });

    console.log('✅ Response received!');
    console.log('📊 Data:', JSON.stringify(data, null, 2));
    console.log(`💰 Cost: $${cost.toFixed(6)}`);

    if (data.trails && Array.isArray(data.trails) && data.trails.length > 0) {
      console.log('\n✅ OpenRouter API is working correctly!\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Unexpected response format\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
