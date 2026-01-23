/**
 * Test database connection and verify data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing PostgreSQL connection...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to PostgreSQL!\n');

    // Count records
    const userCount = await prisma.user.count();
    const hikeCount = await prisma.hike.count();
    const planCount = await prisma.trainingPlan.count();

    console.log('📊 Database Statistics:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Hikes: ${hikeCount}`);
    console.log(`   Training Plans: ${planCount}`);
    console.log('');

    // Test query - get a sample user
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (sampleUser) {
      console.log('👤 Sample User:');
      console.log(`   Email: ${sampleUser.email}`);
      console.log(`   Name: ${sampleUser.name || 'N/A'}`);
      console.log('');
    }

    // Test query - get sample hikes
    const sampleHikes = await prisma.hike.findMany({
      take: 3,
      select: {
        name: true,
        distanceMiles: true,
        elevationGainFt: true,
        countryCode: true,
      },
    });

    console.log('🏔️  Sample Hikes:');
    sampleHikes.forEach((hike, i) => {
      console.log(`   ${i + 1}. ${hike.name}`);
      console.log(`      ${hike.distanceMiles} miles, ${hike.elevationGainFt} ft gain, ${hike.countryCode}`);
    });
    console.log('');

    console.log('🎉 All tests passed! PostgreSQL migration successful!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Login: demo@hikesim.com / password123');
    console.log('');

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection().catch(console.error);
