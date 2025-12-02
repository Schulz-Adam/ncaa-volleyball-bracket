/**
 * Admin script to list all matches
 *
 * Usage:
 *   npx tsx list-matches.ts [--incomplete|--completed]
 */

import { prisma } from './src/lib/prisma.js';

async function listMatches() {
  const args = process.argv.slice(2);
  const showCompleted = args.includes('--completed');
  const showIncomplete = args.includes('--incomplete');

  try {
    const matches = await prisma.match.findMany({
      where:
        showCompleted ? { completed: true } : showIncomplete ? { completed: false } : undefined,
      include: {
        sets: {
          orderBy: { setNumber: 'asc' },
        },
        _count: {
          select: { predictions: true },
        },
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    const roundNames: Record<number, string> = {
      1: 'Round of 64',
      2: 'Round of 32',
      3: 'Sweet 16',
      4: 'Elite 8',
      5: 'Final Four',
      6: 'Championship',
    };

    if (matches.length === 0) {
      console.log('No matches found');
      await prisma.$disconnect();
      return;
    }

    console.log(`\n📋 Matches (${matches.length} total)\n`);

    let currentRound = 0;
    for (const match of matches) {
      if (match.round !== currentRound) {
        currentRound = match.round;
        console.log(`\n━━━ ${roundNames[match.round] || `Round ${match.round}`} ━━━\n`);
      }

      const status = match.completed ? '✅' : '⏳';
      const winner = match.completed
        ? match.winner === 'team1'
          ? match.team1
          : match.team2
        : 'TBD';

      console.log(`${status} Match #${match.matchNumber}`);
      console.log(`   ID: ${match.id}`);
      console.log(`   ${match.team1} vs ${match.team2}`);
      if (match.completed) {
        console.log(`   Winner: ${winner}`);
        if (match.sets.length > 0) {
          const setScores = match.sets.map((s) => `${s.team1Score}-${s.team2Score}`).join(', ');
          console.log(`   Sets: ${setScores}`);
        }
      }
      console.log(`   Predictions: ${match._count.predictions}`);
      console.log('');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error listing matches:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listMatches();
