import { prisma } from '../lib/prisma';

async function verifyPredictions() {
  // Find the Colorado vs American match
  const match = await prisma.match.findFirst({
    where: {
      team1: 'Colorado',
      team2: 'American',
    },
    include: {
      predictions: {
        include: {
          user: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!match) {
    console.log('❌ Match not found');
    return;
  }

  console.log('\n📊 Colorado vs American Match Status:\n');
  console.log(`  Completed: ${match.completed}`);
  console.log(`  Winner: ${match.winner} (${match.winner === 'team1' ? 'Colorado' : 'American'})`);
  console.log(`  Total Predictions: ${match.predictions.length}`);

  // Count predictions with points
  const predictionsWithPoints = match.predictions.filter(p => p.pointsEarned !== null).length;
  console.log(`  Predictions with points assigned: ${predictionsWithPoints}`);

  // Count correct predictions
  const correctPredictions = match.predictions.filter(p => p.predictedWinner === match.winner).length;
  console.log(`  Correct predictions: ${correctPredictions}`);

  console.log('\n📝 Sample predictions (first 10):\n');
  match.predictions.slice(0, 10).forEach(p => {
    const user = p.user.displayName || p.user.email;
    const predicted = p.predictedWinner === 'team1' ? 'Colorado' : 'American';
    const correct = p.predictedWinner === match.winner ? '✅' : '❌';
    console.log(`  ${correct} ${user}: Predicted ${predicted} in ${p.predictedTotalSets} sets | Points: ${p.pointsEarned || 0}`);
  });

  await prisma.$disconnect();
}

verifyPredictions();
