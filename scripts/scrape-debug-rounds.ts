import puppeteer from 'puppeteer';

const NCAA_BRACKET_URL = 'https://www.ncaa.com/brackets/volleyball-women/d1/2025';

async function debugScrape() {
  console.log('🔍 Scraping NCAA bracket to see round distribution...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    await page.goto(NCAA_BRACKET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('.bracket-region, .play-pod', { timeout: 10000 });

    const matches = await page.evaluate(() => {
      const scrapedMatches: any[] = [];
      const pods = document.querySelectorAll('.play-pod');

      pods.forEach((pod, index) => {
        try {
          const teamElements = pod.querySelectorAll('.team');
          const team1Container = teamElements[0];
          const team2Container = teamElements[1];

          if (!team1Container || !team2Container) return;

          const team1NameEl = team1Container.querySelector('.name');
          const team2NameEl = team2Container.querySelector('.name');

          const team1 = team1NameEl?.textContent?.trim() || '';
          const team2 = team2NameEl?.textContent?.trim() || '';

          if (team1 === 'TBD' || team2 === 'TBD' || !team1 || !team2) return;

          const isCompleted = pod.classList.contains('final') || !!pod.querySelector('.winner');
          const round = parseInt(pod.closest('[data-round], .round')?.getAttribute('data-round') || '1');

          scrapedMatches.push({
            round,
            matchNumber: index + 1,
            team1,
            team2,
            completed: isCompleted,
          });
        } catch (error) {
          console.error('Error:', error);
        }
      });

      return scrapedMatches;
    });

    await browser.close();

    console.log(`Total matches scraped: ${matches.length}\n`);

    // Group by round
    const byRound: Record<number, any[]> = {};
    matches.forEach(m => {
      if (!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    });

    Object.keys(byRound).sort().forEach(round => {
      const roundMatches = byRound[Number(round)];
      const completed = roundMatches.filter(m => m.completed).length;
      console.log(`Round ${round}: ${roundMatches.length} matches (${completed} completed)`);

      if (completed > 0) {
        console.log('  Completed matches:');
        roundMatches.filter(m => m.completed).forEach(m => {
          console.log(`    - ${m.team1} vs ${m.team2}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

debugScrape();
