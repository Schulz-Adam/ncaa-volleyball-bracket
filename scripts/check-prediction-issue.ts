import { prisma } from '../lib/prisma';

async function checkPredictionIssue() {
  // Get a completed Round 2 match
  const round2Match = await prisma.match.findFirst({
    where: { round: 2, completed: true },
    include: {
      predictions: {
        take: 5,
        include: {
          user: { select: { displayName: true, email: true } }
        }
      }
    }
  });

  if (!round2Match) {
    console.log('No completed Round 2 matches found');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📊 Round 2 Match: ${round2Match.team1} vs ${round2Match.team2}`);
  console.log(`   Winner: ${round2Match.winner} (${round2Match.winner === 'team1' ? round2Match.team1 : round2Match.team2})`);
  console.log(`\n🔍 Sample Predictions:\n`);

  for (const pred of round2Match.predictions) {
    const predictedTeam = pred.predictedWinner === 'team1' ? round2Match.team1 : round2Match.team2;
    const wasCorrect = pred.predictedWinner === round2Match.winner;

    console.log(`User: ${pred.user.displayName || pred.user.email}`);
    console.log(`  Predicted: ${pred.predictedWinner} (${predictedTeam})`);
    console.log(`  Was Correct: ${wasCorrect ? '✅ YES' : '❌ NO'}`);
    console.log(`  Points Earned: ${pred.pointsEarned}`);
    console.log('');
  }

  console.log('\n⚠️  THE PROBLEM:');
  console.log('The system checks if user predicted "team1" or "team2" correctly,');
  console.log('but does NOT check if they actually predicted these TEAMS would be here.');
  console.log('\nFor example, if a user predicted Nebraska would be team1,');
  console.log('but Nebraska lost in Round 1 and Kansas St. is actually team1,');
  console.log('the user still gets points if team1 wins, even though they predicted the wrong team!\n');

  await prisma.$disconnect();
}

checkPredictionIssue();
