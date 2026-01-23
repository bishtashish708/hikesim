/**
 * Restore data from SQLite backup to PostgreSQL
 * Run this AFTER you've set up Neon and updated DATABASE_URL
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface BackupData {
  users: any[];
  hikes: any[];
  trainingPlans: any[];
  generatedPlans: any[];
  verificationTokens: any[];
}

async function restoreData() {
  const backupDir = join(process.cwd(), 'backup');

  try {
    console.log('🔄 Starting data restoration to PostgreSQL...\n');

    // Read backup files
    const users = JSON.parse(readFileSync(join(backupDir, 'users.json'), 'utf-8'));
    const hikes = JSON.parse(readFileSync(join(backupDir, 'hikes.json'), 'utf-8'));
    const trainingPlans = JSON.parse(readFileSync(join(backupDir, 'training-plans.json'), 'utf-8'));
    const generatedPlans = JSON.parse(readFileSync(join(backupDir, 'generated-plans.json'), 'utf-8'));
    const verificationTokens = JSON.parse(readFileSync(join(backupDir, 'verification-tokens.json'), 'utf-8'));

    // Restore Hikes first (no dependencies)
    console.log('📊 Restoring hikes...');
    for (const hike of hikes) {
      await prisma.hike.create({
        data: {
          id: hike.id,
          name: hike.name,
          distanceMiles: hike.distanceMiles,
          elevationGainFt: hike.elevationGainFt,
          profilePoints: hike.profilePoints,
          countryCode: hike.countryCode,
          stateCode: hike.stateCode,
          isSeed: hike.isSeed,
          createdAt: new Date(hike.createdAt),
        },
      });
    }
    console.log(`✅ Restored ${hikes.length} hikes\n`);

    // Restore Users (without relations)
    console.log('👤 Restoring users...');
    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          image: user.image,
          passwordHash: user.passwordHash,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });
    }
    console.log(`✅ Restored ${users.length} users\n`);

    // Restore Accounts
    console.log('🔐 Restoring accounts...');
    let accountCount = 0;
    for (const user of users) {
      if (user.accounts && user.accounts.length > 0) {
        for (const account of user.accounts) {
          await prisma.account.create({
            data: {
              id: account.id,
              userId: account.userId,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          });
          accountCount++;
        }
      }
    }
    console.log(`✅ Restored ${accountCount} accounts\n`);

    // Restore Sessions
    console.log('🔑 Restoring sessions...');
    let sessionCount = 0;
    for (const user of users) {
      if (user.sessions && user.sessions.length > 0) {
        for (const session of user.sessions) {
          await prisma.session.create({
            data: {
              id: session.id,
              sessionToken: session.sessionToken,
              userId: session.userId,
              expires: new Date(session.expires),
            },
          });
          sessionCount++;
        }
      }
    }
    console.log(`✅ Restored ${sessionCount} sessions\n`);

    // Restore User Profiles
    console.log('📋 Restoring user profiles...');
    let profileCount = 0;
    for (const user of users) {
      if (user.profile) {
        await prisma.userProfile.create({
          data: {
            id: user.profile.id,
            userId: user.profile.userId,
            city: user.profile.city,
            state: user.profile.state,
            birthDate: user.profile.birthDate ? new Date(user.profile.birthDate) : null,
            experience: user.profile.experience,
            weeklyAvailability: user.profile.weeklyAvailability,
            goalHikeId: user.profile.goalHikeId,
            createdAt: new Date(user.profile.createdAt),
            updatedAt: new Date(user.profile.updatedAt),
          },
        });
        profileCount++;
      }
    }
    console.log(`✅ Restored ${profileCount} user profiles\n`);

    // Restore Training Preferences
    console.log('⚙️  Restoring training preferences...');
    let prefCount = 0;
    for (const user of users) {
      if (user.preferences) {
        await prisma.trainingPreferences.create({
          data: {
            id: user.preferences.id,
            userId: user.preferences.userId,
            preferredVolumeMinutes: user.preferences.preferredVolumeMinutes,
            preferredDifficulty: user.preferences.preferredDifficulty,
            trainingVolumeLabel: user.preferences.trainingVolumeLabel,
            crossTrainingPreferences: user.preferences.crossTrainingPreferences,
            createdAt: new Date(user.preferences.createdAt),
            updatedAt: new Date(user.preferences.updatedAt),
          },
        });
        prefCount++;
      }
    }
    console.log(`✅ Restored ${prefCount} training preferences\n`);

    // Restore Generated Plans
    console.log('📝 Restoring generated plans...');
    for (const plan of generatedPlans) {
      await prisma.generatedPlan.create({
        data: {
          id: plan.id,
          hikeId: plan.hikeId,
          settings: plan.settings,
          segments: plan.segments,
          createdAt: new Date(plan.createdAt),
          userId: plan.userId,
        },
      });
    }
    console.log(`✅ Restored ${generatedPlans.length} generated plans\n`);

    // Restore Training Plans
    console.log('🏃 Restoring training plans...');
    for (const plan of trainingPlans) {
      await prisma.trainingPlan.create({
        data: {
          id: plan.id,
          hikeId: plan.hikeId,
          trainingStartDate: new Date(plan.trainingStartDate),
          targetDate: new Date(plan.targetDate),
          settings: plan.settings,
          weeks: plan.weeks,
          createdAt: new Date(plan.createdAt),
          userId: plan.userId,
        },
      });

      // Restore revisions for this plan
      if (plan.revisions && plan.revisions.length > 0) {
        for (const revision of plan.revisions) {
          await prisma.trainingPlanRevision.create({
            data: {
              id: revision.id,
              trainingPlanId: revision.trainingPlanId,
              settings: revision.settings,
              weeks: revision.weeks,
              changeLog: revision.changeLog,
              createdAt: new Date(revision.createdAt),
            },
          });
        }
      }
    }
    console.log(`✅ Restored ${trainingPlans.length} training plans\n`);

    // Restore Workout Feedback
    console.log('💬 Restoring workout feedback...');
    let feedbackCount = 0;
    for (const user of users) {
      if (user.feedback && user.feedback.length > 0) {
        for (const feedback of user.feedback) {
          await prisma.workoutFeedback.create({
            data: {
              id: feedback.id,
              userId: feedback.userId,
              planId: feedback.planId,
              date: new Date(feedback.date),
              workoutType: feedback.workoutType,
              completed: feedback.completed,
              perceivedDifficulty: feedback.perceivedDifficulty,
              actualMinutes: feedback.actualMinutes,
              notes: feedback.notes,
              createdAt: new Date(feedback.createdAt),
            },
          });
          feedbackCount++;
        }
      }
    }
    console.log(`✅ Restored ${feedbackCount} workout feedback entries\n`);

    // Restore Password Reset Tokens
    console.log('🔄 Restoring password reset tokens...');
    let tokenCount = 0;
    for (const user of users) {
      if (user.passwordResetTokens && user.passwordResetTokens.length > 0) {
        for (const token of user.passwordResetTokens) {
          await prisma.passwordResetToken.create({
            data: {
              id: token.id,
              userId: token.userId,
              token: token.token,
              expires: new Date(token.expires),
              createdAt: new Date(token.createdAt),
            },
          });
          tokenCount++;
        }
      }
    }
    console.log(`✅ Restored ${tokenCount} password reset tokens\n`);

    // Restore Verification Tokens
    console.log('✉️  Restoring verification tokens...');
    for (const token of verificationTokens) {
      await prisma.verificationToken.create({
        data: {
          identifier: token.identifier,
          token: token.token,
          expires: new Date(token.expires),
        },
      });
    }
    console.log(`✅ Restored ${verificationTokens.length} verification tokens\n`);

    console.log('🎉 Data restoration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Hikes: ${hikes.length}`);
    console.log(`   Training Plans: ${trainingPlans.length}`);
    console.log(`   Generated Plans: ${generatedPlans.length}`);
    console.log(`   Accounts: ${accountCount}`);
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Profiles: ${profileCount}`);
    console.log(`   Preferences: ${prefCount}`);
    console.log(`   Feedback: ${feedbackCount}`);

  } catch (error) {
    console.error('\n❌ Restoration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreData().catch(console.error);
