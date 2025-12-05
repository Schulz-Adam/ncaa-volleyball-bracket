/**
 * Update set scores for already completed matches
 */

import puppeteer from 'puppeteer';
import { prisma } from '../lib/prisma';

const NCAA_BRACKET_URL = 'https://www.ncaa.com/brackets/volleyball-women/d1/2025';

interface ScrapedMatch {
  team1: string;
  team2: string;
  team1Sets?: number;
  team2Sets?: number;
  completed: boolean;
}

function normalizeTeamName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/St\./g, 'St.')
    .replace(/Fla\./g, 'FL');
}

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

    await page.waitForSelector('.bracket-region, .play-pod', { timeout: 10000 });

    const matches = await page.evaluate(() => {
      const scrapedMatches: ScrapedMatch[] = [];
      const pods = document.querySelectorAll('.play-pod');

      pods.forEach((pod) => {
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

          const isCompleted = pod.classList.contains('final') || !!pod.querySelector('.winner');

          let team1Sets: number | undefined;
          let team2Sets: number | undefined;

          if (isCompleted) {
            const team1ScoreEl = team1Container.querySelector('.score');
            const team2ScoreEl = team2Container.querySelector('.score');
            team1Sets = team1ScoreEl ? parseInt(team1ScoreEl.textContent?.trim() || '0') : undefined;
            team2Sets = team2ScoreEl ? parseInt(team2ScoreEl.textContent?.trim() || '0') : undefined;
          }

          scrapedMatches.push({
            team1,
            team2,
            team1Sets,
            team2Sets,
            completed: isCompleted,
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

async function updateCompletedMatches() {
  try {
    const scrapedMatches = await scrapeBracket();
    const dbMatches = await prisma.match.findMany({
      where: { completed: true },
    });

    let updatedCount = 0;

    for (const scraped of scrapedMatches) {
      if (!scraped.completed) continue;

      const team1 = normalizeTeamName(scraped.team1);
      const team2 = normalizeTeamName(scraped.team2);

      const dbMatch = dbMatches.find(
        (m) =>
          (normalizeTeamName(m.team1) === team1 && normalizeTeamName(m.team2) === team2) ||
          (normalizeTeamName(m.team1) === team2 && normalizeTeamName(m.team2) === team1)
      );

      if (dbMatch && (dbMatch.team1Sets === null || dbMatch.team2Sets === null)) {
        // Update match with set scores
        const team1Sets = normalizeTeamName(dbMatch.team1) === team1 ? scraped.team1Sets : scraped.team2Sets;
        const team2Sets = normalizeTeamName(dbMatch.team1) === team1 ? scraped.team2Sets : scraped.team1Sets;

        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            team1Sets,
            team2Sets,
          },
        });

        console.log(`✅ Updated ${dbMatch.team1} vs ${dbMatch.team2}: ${team1Sets}-${team2Sets}`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} match(es) with set scores!\n`);
  } catch (error) {
    console.error('Error updating matches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompletedMatches();
