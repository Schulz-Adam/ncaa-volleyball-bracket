import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { calculatePoints } from '@/utils/pointCalculation';
import { validateBracketPrediction } from '@/utils/validateBracketPrediction';

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

export const maxDuration = 60; // 60 seconds max for Vercel Pro, 10s for Hobby

export async function POST(request: NextRequest) {
  try {
    // Verify secret token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 Starting NCAA bracket scrape...');

    // Launch browser with serverless Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(NCAA_BRACKET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('.bracket-region, .play-pod', { timeout: 10000 });

    // Scrape matches
    const scrapedMatches = await page.evaluate(() => {
      const matches: any[] = [];
      const pods = document.querySelectorAll('.play-pod');

      pods.forEach((pod, index) => {
        try {
          const teamElements = pod.querySelectorAll('.team');
          const team1Container = teamElements[0];
          const team2Container = teamElements[1];

          if (!team1Container || !team2Container) return;

          const team1NameEl = team1Container.querySelector('.name');
          const team2NameEl = team2Container.querySelector('.name');

          const team1 = team1NameEl?.textContent?.trim() || team1Container.textContent?.trim() || '';
          const team2 = team2NameEl?.textContent?.trim() || team2Container.textContent?.trim() || '';

          if (team1 === 'TBD' || team2 === 'TBD' || !team1 || !team2) return;

          const team1SeedEl = team1Container.querySelector('.seed');
          const team2SeedEl = team2Container.querySelector('.seed');
          const team1Seed = team1SeedEl ? parseInt(team1SeedEl.textContent?.trim() || '0') : undefined;
          const team2Seed = team2SeedEl ? parseInt(team2SeedEl.textContent?.trim() || '0') : undefined;

          const isCompleted = pod.classList.contains('final') || !!pod.querySelector('.winner');

          let winner: 'team1' | 'team2' | undefined;
          let team1Sets: number | undefined;
          let team2Sets: number | undefined;

          if (isCompleted) {
            const team1HasWinner = team1Container.classList.contains('winner') || team1Container.querySelector('.winner');
            const team2HasWinner = team2Container.classList.contains('winner') || team2Container.querySelector('.winner');

            if (team1HasWinner) winner = 'team1';
            else if (team2HasWinner) winner = 'team2';

            const team1ScoreEl = team1Container.querySelector('.score');
            const team2ScoreEl = team2Container.querySelector('.score');
            team1Sets = team1ScoreEl ? parseInt(team1ScoreEl.textContent?.trim() || '0') : undefined;
            team2Sets = team2ScoreEl ? parseInt(team2ScoreEl.textContent?.trim() || '0') : undefined;
          }

          const round = parseInt(pod.closest('[data-round], .round')?.getAttribute('data-round') || '1');
          const matchNumber = index + 1;

          matches.push({
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

      return matches;
    });

    await browser.close();

    console.log(`✅ Scraped ${scrapedMatches.length} matches`);

    // Match with database and update
    const dbMatches = await prisma.match.findMany({
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    let updatedCount = 0;
    let newlyCompletedMatches: any[] = [];

    for (const scraped of scrapedMatches) {
      const dbMatch = dbMatches.find(
        (m) =>
          m.team1.toLowerCase() === scraped.team1.toLowerCase() &&
          m.team2.toLowerCase() === scraped.team2.toLowerCase()
      );

      if (!dbMatch) continue;

      const wasCompleted = dbMatch.completed;
      const isNowCompleted = scraped.completed && scraped.winner;

      if (isNowCompleted && (!wasCompleted || dbMatch.winner !== scraped.winner)) {
        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            completed: true,
            winner: scraped.winner,
            team1Sets: scraped.team1Sets,
            team2Sets: scraped.team2Sets,
            scrapedAt: new Date(),
          },
        });

        updatedCount++;

        if (!wasCompleted) {
          newlyCompletedMatches.push({
            id: dbMatch.id,
            team1: dbMatch.team1,
            team2: dbMatch.team2,
            winner: scraped.winner,
          });
        }
      }
    }

    // Recalculate points for newly completed matches
    if (newlyCompletedMatches.length > 0) {
      console.log(`\n🔄 Recalculating points for ${newlyCompletedMatches.length} newly completed matches...`);

      for (const match of newlyCompletedMatches) {
        const predictions = await prisma.prediction.findMany({
          where: { matchId: match.id },
          include: { match: true },
        });

        for (const prediction of predictions) {
          let points = 0;

          // For Round 2+, validate that the user predicted the correct matchup
          if (prediction.match.round > 1) {
            const isValidPrediction = await validateBracketPrediction(
              prediction.id,
              prediction.matchId,
              prediction.userId
            );

            // If they didn't predict the right teams to be in this match, they get 0 points
            if (!isValidPrediction) {
              points = 0;
            } else {
              // Valid matchup, calculate points normally
              const totalSets = (prediction.match.team1Sets || 0) + (prediction.match.team2Sets || 0);
              points = calculatePoints(
                {
                  predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
                  predictedTotalSets: prediction.predictedTotalSets,
                },
                {
                  winner: prediction.match.winner as 'team1' | 'team2',
                  totalSets,
                  round: prediction.match.round,
                }
              );
            }
          } else {
            // Round 1 - no validation needed
            const totalSets = (prediction.match.team1Sets || 0) + (prediction.match.team2Sets || 0);
            points = calculatePoints(
              {
                predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
                predictedTotalSets: prediction.predictedTotalSets,
              },
              {
                winner: prediction.match.winner as 'team1' | 'team2',
                totalSets,
                round: prediction.match.round,
              }
            );
          }

          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { pointsEarned: points },
          });
        }
      }

      console.log('✅ Points recalculated');
    }

    const response = {
      success: true,
      scrapedMatches: scrapedMatches.length,
      updatedMatches: updatedCount,
      newlyCompletedMatches: newlyCompletedMatches.length,
      matches: newlyCompletedMatches,
    };

    console.log('✅ Scrape completed successfully');

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error in scrape endpoint:', error);
    return NextResponse.json(
      {
        error: 'Scrape failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return POST(request);
}
