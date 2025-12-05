import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    const userCount = await prisma.user.count();
    const matchCount = await prisma.match.count();
    const predictionCount = await prisma.prediction.count();

    console.log('✅ Migration verification:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Matches: ${matchCount}`);
    console.log(`  Predictions: ${predictionCount}`);

    // Check that matches table has new fields
    const sampleMatch = await prisma.match.findFirst();
    if (sampleMatch) {
      console.log('\n✅ Match schema includes new fields:');
      console.log(`  team1Sets: ${sampleMatch.team1Sets ?? 'null'}`);
      console.log(`  team2Sets: ${sampleMatch.team2Sets ?? 'null'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
