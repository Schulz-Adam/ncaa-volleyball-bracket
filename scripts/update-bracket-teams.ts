import { prisma } from '../lib/prisma';

/**
 * Updates TBD matches in Round 2+ with actual team names based on Round 1 winners
 * This mimics the bracket progression logic from the UI
 */
async function updateBracketTeams() {
  console.log('🔄 Updating bracket with Round 1 winners...\n');

  // Get all matches ordered by round
  const allMatches = await prisma.match.findMany({
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const matchesByRound = allMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof allMatches>);

  let updatesCount = 0;

  // For each round starting from 2
  for (let round = 2; round <= 6; round++) {
    const currentRound = matchesByRound[round] || [];
    const previousRound = matchesByRound[round - 1] || [];

    if (currentRound.length === 0 || previousRound.length === 0) continue;

    for (let i = 0; i < currentRound.length; i++) {
      const match = currentRound[i];

      // Only update if still TBD
      if (match.team1 !== 'TBD' && match.team2 !== 'TBD') continue;

      // Determine which previous round matches feed into this match
      let prevMatch1Idx: number;
      let prevMatch2Idx: number;

      if (round === 5) {
        // Final Four: pair matches 0-2 and 1-3 from Elite 8
        prevMatch1Idx = i; // 0 or 1
        prevMatch2Idx = i + 2; // 2 or 3
      } else {
        // Normal pairing: matches pair sequentially (0-1, 2-3, 4-5, etc.)
        prevMatch1Idx = i * 2;
        prevMatch2Idx = i * 2 + 1;
      }

      const prevMatch1 = previousRound[prevMatch1Idx];
      const prevMatch2 = previousRound[prevMatch2Idx];

      let team1: string | null = null;
      let team1Seed: number | null = null;
      let team2: string | null = null;
      let team2Seed: number | null = null;

      // Get team1 from prevMatch1 winner
      if (prevMatch1 && prevMatch1.winner && prevMatch1.completed) {
        team1 = prevMatch1.winner === 'team1' ? prevMatch1.team1 : prevMatch1.team2;
        team1Seed = prevMatch1.winner === 'team1' ? prevMatch1.team1Seed : prevMatch1.team2Seed;
      }

      // Get team2 from prevMatch2 winner
      if (prevMatch2 && prevMatch2.winner && prevMatch2.completed) {
        team2 = prevMatch2.winner === 'team1' ? prevMatch2.team1 : prevMatch2.team2;
        team2Seed = prevMatch2.winner === 'team1' ? prevMatch2.team1Seed : prevMatch2.team2Seed;
      }

      // Update if we have new team info
      if ((team1 && match.team1 === 'TBD') || (team2 && match.team2 === 'TBD')) {
        await prisma.match.update({
          where: { id: match.id },
          data: {
            ...(team1 && { team1, team1Seed }),
            ...(team2 && { team2, team2Seed }),
          },
        });

        console.log(`✅ Round ${round}, Match ${i + 1}: ${team1 || 'TBD'} vs ${team2 || 'TBD'}`);
        updatesCount++;
      }
    }
  }

  console.log(`\n✨ Updated ${updatesCount} matches with team names\n`);

  await prisma.$disconnect();
}

updateBracketTeams();
