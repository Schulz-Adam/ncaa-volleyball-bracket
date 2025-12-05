import { prisma } from '../lib/prisma';

async function showMatchData() {
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

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                  MATCH DATA STORED');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Basic Information:');
  console.log(`   ID: ${match.id}`);
  console.log(`   Round: ${match.round}`);
  console.log(`   Match Number: ${match.matchNumber}`);
  console.log('');

  console.log('🏐 Teams:');
  console.log(`   Team 1: ${match.team1} (Seed: ${match.team1Seed || 'N/A'})`);
  console.log(`   Team 2: ${match.team2} (Seed: ${match.team2Seed || 'N/A'})`);
  console.log('');

  console.log('🏆 Result:');
  console.log(`   Completed: ${match.completed ? '✅ Yes' : '❌ No'}`);
  console.log(`   Winner: ${match.winner || 'N/A'} ${match.winner ? `(${match.winner === 'team1' ? match.team1 : match.team2})` : ''}`);
  console.log('');

  console.log('📅 Timestamps:');
  console.log(`   Match Date: ${match.matchDate.toISOString()}`);
  console.log(`   Created At: ${match.createdAt.toISOString()}`);
  console.log(`   Updated At: ${match.updatedAt.toISOString()}`);
  console.log(`   Scraped At: ${match.scrapedAt ? match.scrapedAt.toISOString() : 'Not scraped yet'}`);
  console.log('');

  console.log('📊 Set Data:');
  console.log(`   Team 1 Sets Won: ${match.team1Sets ?? 'N/A'}`);
  console.log(`   Team 2 Sets Won: ${match.team2Sets ?? 'N/A'}`);
  if (match.team1Sets !== null && match.team2Sets !== null) {
    const totalSets = match.team1Sets + match.team2Sets;
    console.log(`   Total Sets Played: ${totalSets}`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

showMatchData();
