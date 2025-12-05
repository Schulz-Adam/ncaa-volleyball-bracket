import { prisma } from '../lib/prisma';

async function checkSets() {
  const match = await prisma.match.findFirst({
    where: {
      team1: 'Colorado',
      team2: 'American',
    },
  });

  if (!match) {
    console.log('❌ Match not found');
    return;
  }

  console.log('\n📊 Colorado vs American Match:\n');
  console.log(`  Team 1: ${match.team1}`);
  console.log(`  Team 2: ${match.team2}`);
  console.log(`  Winner: ${match.winner} (${match.winner === 'team1' ? match.team1 : match.team2})`);
  console.log(`  Completed: ${match.completed}`);
  console.log(`\n🏐 Set Scores:\n`);
  console.log(`  Team 1 Sets: ${match.team1Sets ?? 'N/A'}`);
  console.log(`  Team 2 Sets: ${match.team2Sets ?? 'N/A'}`);

  if (match.team1Sets !== null && match.team2Sets !== null) {
    const totalSets = match.team1Sets + match.team2Sets;
    console.log(`  Total Sets Played: ${totalSets}`);
  } else {
    console.log('  ⚠️  Set scores not yet recorded\n');
  }

  await prisma.$disconnect();
}

checkSets();
