/**
 * Backup SQLite data before PostgreSQL migration
 * This script exports all data from SQLite to JSON files
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db', // SQLite database
    },
  },
});

async function backupData() {
  const backupDir = join(process.cwd(), 'backup');

  try {
    mkdirSync(backupDir, { recursive: true });
    console.log('📁 Created backup directory');

    // Backup Users
    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        sessions: true,
        passwordResetTokens: true,
        profile: true,
        preferences: true,
        trainingPlans: true,
        generatedPlans: true,
        feedback: true,
      },
    });
    writeFileSync(join(backupDir, 'users.json'), JSON.stringify(users, null, 2));
    console.log(`✅ Backed up ${users.length} users`);

    // Backup Hikes
    const hikes = await prisma.hike.findMany();
    writeFileSync(join(backupDir, 'hikes.json'), JSON.stringify(hikes, null, 2));
    console.log(`✅ Backed up ${hikes.length} hikes`);

    // Backup Training Plans
    const trainingPlans = await prisma.trainingPlan.findMany({
      include: {
        revisions: true,
      },
    });
    writeFileSync(join(backupDir, 'training-plans.json'), JSON.stringify(trainingPlans, null, 2));
    console.log(`✅ Backed up ${trainingPlans.length} training plans`);

    // Backup Generated Plans
    const generatedPlans = await prisma.generatedPlan.findMany();
    writeFileSync(join(backupDir, 'generated-plans.json'), JSON.stringify(generatedPlans, null, 2));
    console.log(`✅ Backed up ${generatedPlans.length} generated plans`);

    // Backup Verification Tokens
    const verificationTokens = await prisma.verificationToken.findMany();
    writeFileSync(join(backupDir, 'verification-tokens.json'), JSON.stringify(verificationTokens, null, 2));
    console.log(`✅ Backed up ${verificationTokens.length} verification tokens`);

    console.log('\n🎉 Backup completed successfully!');
    console.log(`📍 Backup location: ${backupDir}`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupData().catch(console.error);
