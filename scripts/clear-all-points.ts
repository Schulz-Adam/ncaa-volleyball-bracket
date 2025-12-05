import { prisma } from '../lib/prisma';

async function clearAllPoints() {
  console.log('🧹 Clearing all prediction points...\n');

  const result = await prisma.prediction.updateMany({
    where: {
      pointsEarned: { not: null },
    },
    data: {
      pointsEarned: null,
    },
  });

  console.log(`✅ Cleared points from ${result.count} predictions\n`);

  await prisma.$disconnect();
}

clearAllPoints();
