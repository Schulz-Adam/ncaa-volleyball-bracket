/**
 * Debug NCAA Scraper - Extract All Match Data
 *
 * This version extracts detailed match data to help debug
 */

import puppeteer from 'puppeteer';

const NCAA_BRACKET_URL = 'https://www.ncaa.com/brackets/volleyball-women/d1/2025';

async function debugScrape() {
  console.log(`\n🔍 Debugging NCAA bracket scraper...\n`);

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

    // Extract detailed match data
    const matchData = await page.evaluate(() => {
      const pods = document.querySelectorAll('.play-pod');
      const matches: any[] = [];

      pods.forEach((pod, index) => {
        const teamElements = pod.querySelectorAll('.team-name, .team');
        const team1El = teamElements[0];
        const team2El = teamElements[1];

        if (!team1El || !team2El) return;

        const team1 = team1El.textContent?.trim() || '';
        const team2 = team2El.textContent?.trim() || '';

        // Get all classes
        const podClasses = Array.from(pod.classList);
        const statusEl = pod.querySelector('.pod-status');
        const statusClasses = statusEl ? Array.from(statusEl.classList) : [];

        // Check for winner
        const winnerEl = pod.querySelector('.winner');
        const hasWinner = !!winnerEl;

        // Get scores
        const scoreElements = pod.querySelectorAll('.score');
        const scores = Array.from(scoreElements).map(el => el.textContent?.trim() || '');

        // Check if final
        const isFinal = podClasses.includes('final') || statusClasses.includes('final');
        const isPre = podClasses.includes('pre') || statusClasses.includes('pre');
        const isLive = podClasses.includes('live') || statusClasses.includes('live');

        matches.push({
          index: index + 1,
          team1,
          team2,
          podClasses,
          statusClasses,
          hasWinner,
          winnerText: winnerEl?.textContent?.trim(),
          scores,
          isFinal,
          isPre,
          isLive,
        });
      });

      return matches;
    });

    console.log(`\n📊 Found ${matchData.length} matches:\n`);

    // Filter for matches with teams
    const validMatches = matchData.filter(m => m.team1 && m.team2 && m.team1 !== 'TBD' && m.team2 !== 'TBD');

    console.log(`✅ Valid matches (not TBD): ${validMatches.length}\n`);

    // Look for Colorado vs American
    const coloradoMatch = validMatches.find(m =>
      (m.team1.includes('Colorado') || m.team2.includes('Colorado')) ||
      (m.team1.includes('American') || m.team2.includes('American'))
    );

    if (coloradoMatch) {
      console.log('🎯 Found Colorado/American match:');
      console.log(JSON.stringify(coloradoMatch, null, 2));
    } else {
      console.log('⚠️  Colorado vs American match not found\n');
      console.log('First 5 valid matches:');
      validMatches.slice(0, 5).forEach(m => {
        console.log(`  ${m.team1} vs ${m.team2} | Final: ${m.isFinal} | Winner: ${m.hasWinner}`);
      });
    }

    // Show completed matches
    const completedMatches = validMatches.filter(m => m.isFinal || m.hasWinner);
    console.log(`\n🏁 Completed matches: ${completedMatches.length}`);
    if (completedMatches.length > 0) {
      completedMatches.forEach(m => {
        console.log(`  ✅ ${m.team1} vs ${m.team2}`);
        console.log(`     Classes: ${m.podClasses.join(', ')}`);
        console.log(`     Winner: ${m.hasWinner}, Scores: ${m.scores.join(', ')}\n`);
      });
    }

    await browser.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    await browser.close();
    process.exit(1);
  }
}

debugScrape();
