import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPointValues() {
  try {
    // Get unique point values
    const uniquePoints = await prisma.prediction.findMany({
      where: {
        pointsEarned: { not: null }
      },
      distinct: ['pointsEarned'],
      select: {
        pointsEarned: true
      },
      orderBy: {
        pointsEarned: 'desc'
      }
    });

    console.log('🔢 Unique Point Values in Database:\n');
    uniquePoints.forEach(p => {
      console.log(`  ${p.pointsEarned} points`);
    });

    // Get count for each
    const counts = await Promise.all(
      uniquePoints.map(async (p) => {
        const count = await prisma.prediction.count({
          where: { pointsEarned: p.pointsEarned }
        });
        return { points: p.pointsEarned, count };
      })
    );

    console.log('\n📊 Points Distribution:');
    counts.forEach(c => {
      console.log(`  ${c.points?.toFixed(2)} pts: ${c.count} predictions`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPointValues();
