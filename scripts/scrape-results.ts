/**
 * Automated NCAA Bracket Results Scraper
 *
 * Fetches match results from NCAA.com and stores them in the database.
 * This script ONLY aggregates results - it does NOT calculate or assign points.
 *
 * Updates:
 * - Match winner (team1 or team2)
 * - Match completion status
 * - Scraped timestamp
 * - Number of sets won by each team (e.g., 3-1, 3-2)
 *
 * Usage:
 *   npx tsx scripts/scrape-results.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Show what would be updated without making changes
 */

import puppeteer from 'puppeteer';
import { prisma } from '../lib/prisma';
import { calculatePoints } from '../utils/pointCalculation';

const NCAA_BRACKET_URL = 'https://www.ncaa.com/brackets/volleyball-women/d1/2025';

interface ScrapedMatch {
  round: number;
  matchNumber: number;
  team1: string;
  team2: string;
  team1Seed?: number;
  team2Seed?: number;
  winner?: 'team1' | 'team2';
  completed: boolean;
  team1Sets?: number;
  team2Sets?: number;
}

/**
 * Normalize team names to match database (handle variations)
 */
function normalizeTeamName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/St\./g, 'St.')
    .replace(/Fla\./g, 'FL');
}

/**
 * Scrape bracket data from NCAA website
 */
async function scrapeBracket(): Promise<ScrapedMatch[]> {
  console.log(`\n🔍 Scraping NCAA bracket from ${NCAA_BRACKET_URL}...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(NCAA_BRACKET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for bracket to load
    await page.waitForSelector('.bracket-region, .play-pod', { timeout: 10000 });

    // Extract match data from the page
    const matches = await page.evaluate(() => {
      const scrapedMatches: ScrapedMatch[] = [];

      // Find all match "pods"
      const pods = document.querySelectorAll('.play-pod');

      pods.forEach((pod, index) => {
        try {
          // Extract team containers
          const teamElements = pod.querySelectorAll('.team');
          const team1Container = teamElements[0];
          const team2Container = teamElements[1];

          if (!team1Container || !team2Container) return;

          // Extract team names (from .name element specifically, not the whole container)
          const team1NameEl = team1Container.querySelector('.name');
          const team2NameEl = team2Container.querySelector('.name');

          const team1 = team1NameEl?.textContent?.trim() || team1Container.textContent?.trim() || '';
          const team2 = team2NameEl?.textContent?.trim() || team2Container.textContent?.trim() || '';

          if (team1 === 'TBD' || team2 === 'TBD' || !team1 || !team2) return;

          // Extract seeds
          const team1SeedEl = team1Container.querySelector('.seed');
          const team2SeedEl = team2Container.querySelector('.seed');
          const team1Seed = team1SeedEl
            ? parseInt(team1SeedEl.textContent?.trim() || '0')
            : undefined;
          const team2Seed = team2SeedEl
            ? parseInt(team2SeedEl.textContent?.trim() || '0')
            : undefined;

          // Check if match is completed
          const isCompleted = pod.classList.contains('final') || !!pod.querySelector('.winner');

          // Extract scores if completed
          let winner: 'team1' | 'team2' | undefined;
          let team1Sets: number | undefined;
          let team2Sets: number | undefined;

          if (isCompleted) {
            // Determine winner - check which team container has the winner class
            const team1HasWinner = team1Container.classList.contains('winner') ||
                                   team1Container.querySelector('.winner');
            const team2HasWinner = team2Container.classList.contains('winner') ||
                                   team2Container.querySelector('.winner');

            if (team1HasWinner) {
              winner = 'team1';
            } else if (team2HasWinner) {
              winner = 'team2';
            }

            // Extract set scores (like 3-0, 3-1, etc.)
            const team1ScoreEl = team1Container.querySelector('.score');
            const team2ScoreEl = team2Container.querySelector('.score');
            team1Sets = team1ScoreEl ? parseInt(team1ScoreEl.textContent?.trim() || '0') : undefined;
            team2Sets = team2ScoreEl ? parseInt(team2ScoreEl.textContent?.trim() || '0') : undefined;
          }

          // Determine round from bracket structure
          // The bracket has columns for each round
          let round = 1;
          const parentColumn = pod.closest('.bracket-column, [class*="round"], [class*="column"]');
          if (parentColumn) {
            const columnClasses = parentColumn.className;
            // Try to extract round from class names
            const roundMatch = columnClasses.match(/round-?(\d+)/i);
            if (roundMatch) {
              round = parseInt(roundMatch[1]);
            } else {
              // Count bracket levels up to determine round
              const bracketsContainer = pod.closest('.brackets, .bracket-container, .bracket-region');
              if (bracketsContainer) {
                const allColumns = Array.from(bracketsContainer.querySelectorAll('.bracket-column, [class*="round"], [class*="column"]'));
                const columnIndex = allColumns.indexOf(parentColumn as Element);
                if (columnIndex >= 0) {
                  round = columnIndex + 1;
                }
              }
            }
          }

          // Fallback: use matchNumber to infer round (32 matches = round 1, 16 = round 2, etc.)
          // This is very approximate but better than nothing
          const matchNumber = index + 1;

          scrapedMatches.push({
            round,
            matchNumber,
            team1,
            team2,
            team1Seed,
            team2Seed,
            winner,
            completed: isCompleted,
            team1Sets,
            team2Sets,
          });
        } catch (error) {
          console.error('Error parsing match pod:', error);
        }
      });

      return scrapedMatches;
    });

    console.log(`✅ Scraped ${matches.length} matches from NCAA website`);
    return matches;
  } finally {
    await browser.close();
  }
}

/**
 * Match scraped data with database matches
 */
async function matchWithDatabase(scrapedMatches: ScrapedMatch[]) {
  const dbMatches = await prisma.match.findMany({
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const updates: Array<{
    dbMatch: any;
    scrapedMatch: ScrapedMatch;
  }> = [];

  for (const scraped of scrapedMatches) {
    // Normalize team names
    const team1 = normalizeTeamName(scraped.team1);
    const team2 = normalizeTeamName(scraped.team2);

    // Find match by team names (ignore round since NCAA site doesn't mark them correctly)
    const dbMatch = dbMatches.find(
      (m) =>
        (normalizeTeamName(m.team1) === team1 && normalizeTeamName(m.team2) === team2) ||
        (normalizeTeamName(m.team1) === team2 && normalizeTeamName(m.team2) === team1) ||
        // Also match if database has TBD and we need to update it
        (m.team1 === 'TBD' && m.team2 === 'TBD' && !dbMatches.some(other =>
          other !== m &&
          ((normalizeTeamName(other.team1) === team1 && normalizeTeamName(other.team2) === team2) ||
           (normalizeTeamName(other.team1) === team2 && normalizeTeamName(other.team2) === team1))
        ))
    );

    if (dbMatch) {
      // Only add to updates if completed OR has different data
      const needsUpdate =
        scraped.completed !== dbMatch.completed ||
        dbMatch.team1 === 'TBD' ||
        dbMatch.team2 === 'TBD' ||
        normalizeTeamName(dbMatch.team1) !== team1 ||
        normalizeTeamName(dbMatch.team2) !== team2;

      if (needsUpdate) {
        updates.push({ dbMatch, scrapedMatch: scraped });
      }
    }
  }

  return updates;
}

/**
 * Update database with scraped results
 */
async function updateResults(
  updates: Array<{ dbMatch: any; scrapedMatch: ScrapedMatch }>,
  dryRun: boolean
) {
  if (updates.length === 0) {
    console.log('\n✨ No updates needed\n');
    return;
  }

  const teamNameUpdates = updates.filter(u => u.dbMatch.team1 === 'TBD' || u.dbMatch.team2 === 'TBD');
  const completedUpdates = updates.filter(u => u.scrapedMatch.completed && !u.dbMatch.completed);

  if (teamNameUpdates.length > 0) {
    console.log(`\n🔄 Updating team names for ${teamNameUpdates.length} match(es)...\n`);
    for (const { dbMatch, scrapedMatch } of teamNameUpdates) {
      console.log(`Round ${scrapedMatch.round}: ${scrapedMatch.team1} vs ${scrapedMatch.team2}`);

      if (!dryRun) {
        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            team1: scrapedMatch.team1,
            team2: scrapedMatch.team2,
            team1Seed: scrapedMatch.team1Seed,
            team2Seed: scrapedMatch.team2Seed,
          },
        });
      } else {
        console.log(`   [DRY RUN - No changes made]`);
      }
    }
  }

  if (completedUpdates.length === 0) {
    console.log('\n✨ No new completed matches found\n');
    return;
  }

  console.log(`\n📊 Found ${completedUpdates.length} newly completed match(es):\n`);

  for (const { dbMatch, scrapedMatch } of completedUpdates) {
    const winner = scrapedMatch.winner!;
    const winnerTeam = winner === 'team1' ? scrapedMatch.team1 : scrapedMatch.team2;

    console.log(`⚡ ${scrapedMatch.team1} vs ${scrapedMatch.team2}`);
    console.log(`   Winner: ${winnerTeam}`);
    if (scrapedMatch.team1Sets !== undefined && scrapedMatch.team2Sets !== undefined) {
      console.log(`   Set Score: ${scrapedMatch.team1Sets}-${scrapedMatch.team2Sets}`);
    }

    if (dryRun) {
      console.log(`   [DRY RUN - No changes made]\n`);
      continue;
    }

    // Get all predictions for this match
    const predictions = await prisma.prediction.findMany({
      where: { matchId: dbMatch.id },
    });

    // Update match and calculate points for all predictions
    await prisma.match.update({
      where: { id: dbMatch.id },
      data: {
        team1: scrapedMatch.team1,
        team2: scrapedMatch.team2,
        team1Seed: scrapedMatch.team1Seed,
        team2Seed: scrapedMatch.team2Seed,
        completed: true,
        winner,
        team1Sets: scrapedMatch.team1Sets,
        team2Sets: scrapedMatch.team2Sets,
        scrapedAt: new Date(),
      },
    });

    // Calculate and update points for each prediction
    const totalSets = (scrapedMatch.team1Sets || 0) + (scrapedMatch.team2Sets || 0);
    let pointsUpdated = 0;

    for (const prediction of predictions) {
      const points = calculatePoints(
        {
          predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
          predictedTotalSets: prediction.predictedTotalSets,
        },
        {
          winner: winner as 'team1' | 'team2',
          totalSets,
          round: dbMatch.round,
        }
      );

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });

      pointsUpdated++;
    }

    console.log(`   ✅ Match results stored successfully`);
    console.log(`   🎯 Updated points for ${pointsUpdated} prediction(s)\n`);
  }

  if (!dryRun) {
    console.log(`\n🎉 Successfully updated ${updates.length} match(es)!\n`);
  }
}

/**
 * Main scraper function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  try {
    const scrapedMatches = await scrapeBracket();
    const updates = await matchWithDatabase(scrapedMatches);
    await updateResults(updates, dryRun);

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error scraping results:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
