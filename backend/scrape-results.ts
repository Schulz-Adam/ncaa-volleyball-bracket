/**
 * Automated NCAA Bracket Results Scraper
 *
 * Fetches match results from NCAA.com and automatically updates the database
 *
 * Usage:
 *   npx tsx scrape-results.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Show what would be updated without making changes
 */

import puppeteer from 'puppeteer';
import { prisma } from './src/lib/prisma.js';
import { calculatePoints, determineWinner } from './src/utils/pointCalculation.js';

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
  sets?: Array<{ team1Score: number; team2Score: number }>;
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
          // Extract team names
          const teamElements = pod.querySelectorAll('.team-name, .team');
          const team1El = teamElements[0];
          const team2El = teamElements[1];

          if (!team1El || !team2El) return;

          const team1 = team1El.textContent?.trim() || '';
          const team2 = team2El.textContent?.trim() || '';

          if (team1 === 'TBD' || team2 === 'TBD' || !team1 || !team2) return;

          // Extract seeds
          const seedElements = pod.querySelectorAll('.seed');
          const team1Seed = seedElements[0]
            ? parseInt(seedElements[0].textContent?.trim() || '0')
            : undefined;
          const team2Seed = seedElements[1]
            ? parseInt(seedElements[1].textContent?.trim() || '0')
            : undefined;

          // Check if match is completed
          const isCompleted = pod.classList.contains('final') || pod.querySelector('.winner');

          // Extract scores if completed
          let winner: 'team1' | 'team2' | undefined;
          let sets: Array<{ team1Score: number; team2Score: number }> | undefined;

          if (isCompleted) {
            // Determine winner
            const winnerEl = pod.querySelector('.winner');
            if (winnerEl) {
              const isTeam1Winner = winnerEl === team1El || winnerEl.closest('.team-1, .top');
              winner = isTeam1Winner ? 'team1' : 'team2';
            }

            // Try to extract set scores (if available in detail view)
            const scoreElements = pod.querySelectorAll('.score, .set-score');
            if (scoreElements.length > 0) {
              sets = [];
              // This part may need adjustment based on actual NCAA HTML structure
            }
          }

          // Determine round and match number from position/structure
          // This is approximate - may need adjustment
          const round = parseInt(
            pod.closest('[data-round], .round')?.getAttribute('data-round') || '1'
          );
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
            sets,
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
    where: { completed: false },
    include: {
      predictions: true,
    },
  });

  const updates: Array<{
    dbMatch: any;
    scrapedMatch: ScrapedMatch;
  }> = [];

  for (const scraped of scrapedMatches) {
    if (!scraped.completed || !scraped.winner) continue;

    // Normalize team names
    const team1 = normalizeTeamName(scraped.team1);
    const team2 = normalizeTeamName(scraped.team2);

    // Find matching database match
    const dbMatch = dbMatches.find(
      (m) =>
        (normalizeTeamName(m.team1) === team1 && normalizeTeamName(m.team2) === team2) ||
        (normalizeTeamName(m.team1) === team2 && normalizeTeamName(m.team2) === team1)
    );

    if (dbMatch) {
      updates.push({ dbMatch, scrapedMatch: scraped });
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
    console.log('\n✨ No new completed matches found\n');
    return;
  }

  console.log(`\n📊 Found ${updates.length} newly completed match(es):\n`);

  for (const { dbMatch, scrapedMatch } of updates) {
    const winner = scrapedMatch.winner!;
    const winnerTeam = winner === 'team1' ? scrapedMatch.team1 : scrapedMatch.team2;

    console.log(`⚡ ${dbMatch.team1} vs ${dbMatch.team2}`);
    console.log(`   Winner: ${winnerTeam}`);
    console.log(`   Predictions to update: ${dbMatch.predictions.length}`);

    if (dryRun) {
      console.log(`   [DRY RUN - No changes made]\n`);
      continue;
    }

    // Update match
    await prisma.match.update({
      where: { id: dbMatch.id },
      data: {
        completed: true,
        winner,
      },
    });

    // If we have set data, store it
    if (scrapedMatch.sets && scrapedMatch.sets.length > 0) {
      await prisma.set.createMany({
        data: scrapedMatch.sets.map((set, index) => ({
          matchId: dbMatch.id,
          setNumber: index + 1,
          team1Score: set.team1Score,
          team2Score: set.team2Score,
        })),
      });
    }

    // Calculate points for all predictions
    // Note: Without set data, we can only give base points for correct winner
    const totalSets = scrapedMatch.sets?.length || 3; // Default to 3 if unknown

    for (const prediction of dbMatch.predictions) {
      const points = calculatePoints(
        {
          predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
          predictedTotalSets: prediction.predictedTotalSets,
        },
        {
          winner,
          totalSets,
          round: dbMatch.round,
        }
      );

      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });
    }

    console.log(`   ✅ Updated successfully\n`);
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
