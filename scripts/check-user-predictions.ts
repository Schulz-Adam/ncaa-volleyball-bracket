import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserPredictions() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'schulzy_ar@hotmail.com'
      },
      include: {
        predictions: {
          include: {
            match: true
          },
          where: {
            match: {
              completed: true
            }
          }
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`\n👤 User: ${user.email}`);
    console.log(`📊 Completed match predictions:\n`);

    user.predictions.forEach((p, i) => {
      const match = p.match;
      const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);
      const predictedWinner = p.predictedWinner === 'team1' ? match.team1 : match.team2;
      const actualWinner = match.winner === 'team1' ? match.team1 : match.team2;

      console.log(`${i + 1}. ${match.team1} vs ${match.team2} (Round ${match.round})`);
      console.log(`   Predicted: ${predictedWinner} in ${p.predictedTotalSets} sets`);
      console.log(`   Actual: ${actualWinner} won ${match.team1Sets}-${match.team2Sets} (${totalSets} total sets)`);
      console.log(`   Winner Match: ${p.predictedWinner === match.winner ? '✅' : '❌'}`);
      console.log(`   Sets Match: ${p.predictedTotalSets === totalSets ? '✅' : '❌'}`);
      console.log(`   Points Earned: ${p.pointsEarned?.toFixed(2)}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPredictions();
