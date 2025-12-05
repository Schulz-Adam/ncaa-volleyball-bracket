/**
 * Simple NCAA Results Scraper - Test Version
 *
 * This version helps debug and understand the NCAA bracket structure
 *
 * Usage: npx tsx scripts/scrape-simple.ts
 */

import puppeteer from 'puppeteer';

const NCAA_BRACKET_URL = 'https://www.ncaa.com/brackets/volleyball-women/d1/2025';

async function testScrape() {
  console.log(`\n🔍 Testing NCAA bracket scraper...\n`);

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`📡 Loading ${NCAA_BRACKET_URL}...`);

    await page.goto(NCAA_BRACKET_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log(`✅ Page loaded, waiting for bracket...`);

    // Wait a bit for Vue to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take a screenshot for debugging
    await page.screenshot({ path: 'ncaa-bracket.png', fullPage: true });
    console.log(`📸 Screenshot saved to ncaa-bracket.png`);

    // Get page HTML to inspect structure
    const html = await page.content();

    // Try to find match elements
    const matchInfo = await page.evaluate(() => {
      const info = {
        playPods: document.querySelectorAll('.play-pod').length,
        teams: document.querySelectorAll('.team, .team-name').length,
        winners: document.querySelectorAll('.winner').length,
        scores: document.querySelectorAll('.score').length,
        bodyText: document.body.innerText.substring(0, 500),
      };

      // Get first few team names
      const teamNames: string[] = [];
      document.querySelectorAll('.team-name, .team').forEach((el, i) => {
        if (i < 10) teamNames.push(el.textContent?.trim() || '');
      });

      return { ...info, sampleTeams: teamNames };
    });

    console.log(`\n📊 Page Structure:`);
    console.log(`   Play pods found: ${matchInfo.playPods}`);
    console.log(`   Team elements found: ${matchInfo.teams}`);
    console.log(`   Winner indicators: ${matchInfo.winners}`);
    console.log(`   Score elements: ${matchInfo.scores}`);
    console.log(`\n📝 Sample teams:`, matchInfo.sampleTeams);
    console.log(`\n📄 First 500 chars of page text:`);
    console.log(matchInfo.bodyText);

    console.log(`\n✨ Keeping browser open for inspection. Press Ctrl+C to close.\n`);

    // Keep browser open for manual inspection
    await new Promise(() => {}); // Wait forever

  } catch (error) {
    console.error('\n❌ Error:', error);
    await browser.close();
    process.exit(1);
  }
}

testScrape();
