import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

interface BracketMatch {
  gameId: string;
  round: number;
  team1: string;
  team2: string;
  team1Logo: string;
  team2Logo: string;
  team1Seed: number | null;
  team2Seed: number | null;
  matchDate: Date;
  matchNumber: number;
}

function parseHTMLBracket(html: string): BracketMatch[] {
  const matches: BracketMatch[] = [];
  let matchNumber = 1;

  // Extract all game pods with IDs 101-124 (first round matches)
  const gamePodRegex = /<div id="(\d+)" class="play-pod game-pod[^"]*"[^>]*>(.*?)<\/div><div class="bracket-lines/gs;

  let match;
  while ((match = gamePodRegex.exec(html)) !== null) {
    const gameId = match[1];
    const podContent = match[2];

    // Skip empty pods
    if (podContent.includes('empty-pod')) {
      continue;
    }

    // Determine round based on game ID
    let round = 1;
    const id = parseInt(gameId);
    if (id >= 101 && id <= 132) round = 1;  // First round (64 teams -> 32)
    else if (id >= 201 && id <= 216) round = 2; // Second round (32 -> 16)
    else if (id >= 301 && id <= 308) round = 3; // Third round (16 -> 8)
    else if (id >= 401 && id <= 404) round = 4; // Quarterfinals (8 -> 4)
    else if (id >= 501 && id <= 502) round = 5; // Semifinals (4 -> 2)
    else if (id === '601') round = 6; // Championship (2 -> 1)

    // Extract date and time
    const dateMatch = podContent.match(/<span class="game-date"[^>]*>(\d+\/\d+)<\/span>/);
    const timeMatch = podContent.match(/<span class="game-time"[^>]*> - ([\d:]+[AP]M UTC)<\/span>/);

    let matchDate = new Date('2025-12-04'); // Default date
    if (dateMatch) {
      const [month, day] = dateMatch[1].split('/');
      matchDate = new Date(`2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);

      if (timeMatch) {
        const timeStr = timeMatch[1].replace(' UTC', '');
        const [time, period] = timeStr.split(/(AM|PM)/);
        const [hours, minutes] = time.split(':');
        let hour = parseInt(hours);

        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;

        matchDate.setUTCHours(hour, parseInt(minutes || '0'), 0, 0);
      }
    }

    // Extract team information
    const teamRegex = /<div class="team"[^>]*>.*?<img src="([^"]*)"[^>]*>.*?(?:<span class="seed"[^>]*>(\d+)<\/span>)?.*?<span class="name"[^>]*>([^<]+)<\/span>/gs;

    const teams = [];
    let teamMatch;
    while ((teamMatch = teamRegex.exec(podContent)) !== null && teams.length < 2) {
      teams.push({
        logo: teamMatch[1].startsWith('//') ? 'https:' + teamMatch[1] : teamMatch[1],
        seed: teamMatch[2] ? parseInt(teamMatch[2]) : null,
        name: decodeHTML(teamMatch[3].trim())
      });
    }

    if (teams.length === 2) {
      matches.push({
        gameId,
        round,
        team1: teams[0].name,
        team2: teams[1].name,
        team1Logo: teams[0].logo,
        team2Logo: teams[1].logo,
        team1Seed: teams[0].seed,
        team2Seed: teams[1].seed,
        matchDate,
        matchNumber: matchNumber++
      });
    }
  }

  return matches;
}

async function populateBracket() {
  try {
    console.log('Reading bracket HTML file...');
    const htmlPath = path.join(__dirname, '..', '..', 'ncaa_bracket.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    console.log('Parsing bracket data...');
    const matches = parseHTMLBracket(html);

    console.log(`Found ${matches.length} matches`);

    // Delete existing matches
    console.log('Clearing existing matches...');
    await prisma.match.deleteMany({});

    // Insert new matches
    console.log('Inserting matches into database...');
    for (const match of matches) {
      await prisma.match.create({
        data: {
          round: match.round,
          matchNumber: match.matchNumber,
          team1: match.team1,
          team2: match.team2,
          team1Logo: match.team1Logo,
          team2Logo: match.team2Logo,
          team1Seed: match.team1Seed,
          team2Seed: match.team2Seed,
          matchDate: match.matchDate,
          scrapedAt: new Date(),
          completed: false
        }
      });
      console.log(`✓ Inserted: ${match.team1} vs ${match.team2} (Round ${match.round})`);
    }

    console.log('\n✅ Successfully populated bracket with', matches.length, 'matches!');
  } catch (error) {
    console.error('Error populating bracket:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateBracket();
