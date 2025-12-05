import { PrismaClient } from '@prisma/client';
import { calculatePoints } from '../utils/pointCalculation';

const prisma = new PrismaClient();

async function testPointCalculation() {
  try {
    // Get the Kansas match and a prediction for it
    const match = await prisma.match.findFirst({
      where: {
        team1: 'High Point',
        team2: 'Kansas'
      },
      include: {
        predictions: {
          where: {
            predictedWinner: 'team2', // Kansas
            predictedTotalSets: 3
          },
          take: 1
        }
      }
    });

    if (!match) {
      console.log('Match not found');
      return;
    }

    const prediction = match.predictions[0];
    if (!prediction) {
      console.log('Prediction not found');
      return;
    }

    console.log('📋 Match Details:');
    console.log(`   ${match.team1} vs ${match.team2}`);
    console.log(`   Winner: ${match.winner}`);
    console.log(`   Score: ${match.team1Sets}-${match.team2Sets}`);
    console.log(`   Total Sets: ${(match.team1Sets || 0) + (match.team2Sets || 0)}`);
    console.log(`   Round: ${match.round}`);
    console.log('');

    console.log('🎯 Prediction Details:');
    console.log(`   Predicted Winner: ${prediction.predictedWinner}`);
    console.log(`   Predicted Total Sets: ${prediction.predictedTotalSets}`);
    console.log(`   Current Points: ${prediction.pointsEarned}`);
    console.log('');

    const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);

    console.log('🧮 Testing calculatePoints function:');
    const calculatedPoints = calculatePoints(
      {
        predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
        predictedTotalSets: prediction.predictedTotalSets
      },
      {
        winner: match.winner as 'team1' | 'team2',
        totalSets: totalSets,
        round: match.round
      }
    );

    console.log(`   Input - predictedWinner: ${prediction.predictedWinner}`);
    console.log(`   Input - predictedTotalSets: ${prediction.predictedTotalSets}`);
    console.log(`   Input - actual winner: ${match.winner}`);
    console.log(`   Input - actual totalSets: ${totalSets}`);
    console.log(`   Input - round: ${match.round}`);
    console.log('');
    console.log(`   ✨ Calculated Points: ${calculatedPoints}`);
    console.log(`   💾 Stored Points: ${prediction.pointsEarned}`);
    console.log('');

    if (calculatedPoints !== prediction.pointsEarned) {
      console.log('❌ MISMATCH! Points were calculated incorrectly!');
    } else {
      console.log('✅ Points match - but they should be 1.1, not 1.0!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPointCalculation();
