import { prisma } from '../lib/prisma';

async function resetMatch() {
  // Reset Colorado vs American match to test scraper
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

  console.log('🔄 Resetting Colorado vs American match...');

  // Reset match
  await prisma.match.update({
    where: { id: match.id },
    data: {
      completed: false,
      winner: null,
      scrapedAt: null,
      team1Sets: null,
      team2Sets: null,
    },
  });

  console.log('✅ Match reset successfully - ready for re-scraping\n');

  await prisma.$disconnect();
}

resetMatch();
