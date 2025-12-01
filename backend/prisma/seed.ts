import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sample NCAA Division I Women's Volleyball teams for a 64-team bracket
const teams = [
  // Top seeds
  'Nebraska', 'Texas', 'Wisconsin', 'Stanford',
  'Penn State', 'Pittsburgh', 'Minnesota', 'Louisville',
  // Strong programs
  'Kentucky', 'Oregon', 'Purdue', 'Florida',
  'Creighton', 'Marquette', 'Kansas', 'Georgia Tech',
  // Mid-tier
  'TCU', 'SMU', 'Ohio State', 'Michigan',
  'UCLA', 'USC', 'Washington', 'BYU',
  // Additional teams for 64-team bracket
  'Baylor', 'Tennessee', 'Missouri', 'Arkansas',
  'Arizona', 'Colorado', 'Utah', 'Oregon State',
  'Illinois', 'Northwestern', 'Indiana', 'Rutgers',
  'Iowa', 'Maryland', 'Michigan State', 'Penn',
  'Princeton', 'Yale', 'Harvard', 'Columbia',
  'Rice', 'Tulane', 'Houston', 'Memphis',
  'Charlotte', 'FAU', 'FIU', 'UTSA',
  'Denver', 'Northern Iowa', 'Loyola Chicago', 'Drake',
  'Dayton', 'VCU', 'Saint Louis', 'George Mason',
  'Montana', 'Weber State', 'Idaho State', 'Montana State'
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.prediction.deleteMany();
  await prisma.set.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();

  // Create users with hashed passwords
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: hashedPassword,
      displayName: 'Alice Johnson',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: hashedPassword,
      displayName: 'Bob Smith',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      password: hashedPassword,
      displayName: 'Charlie Davis',
    },
  });

  console.log('✅ Created 3 users (password: password123)');

  // Create full tournament bracket
  console.log('Creating tournament matches...');
  const baseDate = new Date('2024-12-05');
  let matchNumber = 1;

  // Round 1 - Round of 64 (32 matches)
  console.log('Creating Round of 64...');
  for (let i = 0; i < 32; i++) {
    const team1 = teams[i * 2];
    const team2 = teams[i * 2 + 1];
    const matchDate = new Date(baseDate);
    matchDate.setHours(matchDate.getHours() + (i % 8) * 3);

    await prisma.match.create({
      data: {
        round: 1,
        matchNumber: matchNumber++,
        team1,
        team2,
        matchDate,
        completed: false,
      },
    });
  }

  // Round 2 - Round of 32 (16 matches)
  console.log('Creating Round of 32...');
  const round2Date = new Date(baseDate);
  round2Date.setDate(round2Date.getDate() + 2);

  for (let i = 0; i < 16; i++) {
    const matchDate = new Date(round2Date);
    matchDate.setHours(matchDate.getHours() + (i % 8) * 3);

    await prisma.match.create({
      data: {
        round: 2,
        matchNumber: matchNumber++,
        team1: 'TBD',
        team2: 'TBD',
        matchDate,
        completed: false,
      },
    });
  }

  // Round 3 - Sweet 16 (8 matches)
  console.log('Creating Sweet 16...');
  const round3Date = new Date(baseDate);
  round3Date.setDate(round3Date.getDate() + 5);

  for (let i = 0; i < 8; i++) {
    const matchDate = new Date(round3Date);
    matchDate.setHours(matchDate.getHours() + (i % 4) * 4);

    await prisma.match.create({
      data: {
        round: 3,
        matchNumber: matchNumber++,
        team1: 'TBD',
        team2: 'TBD',
        matchDate,
        completed: false,
      },
    });
  }

  // Round 4 - Elite 8 (4 matches)
  console.log('Creating Elite 8...');
  const round4Date = new Date(baseDate);
  round4Date.setDate(round4Date.getDate() + 7);

  for (let i = 0; i < 4; i++) {
    const matchDate = new Date(round4Date);
    matchDate.setHours(matchDate.getHours() + i * 4);

    await prisma.match.create({
      data: {
        round: 4,
        matchNumber: matchNumber++,
        team1: 'TBD',
        team2: 'TBD',
        matchDate,
        completed: false,
      },
    });
  }

  // Round 5 - Final Four (2 matches)
  console.log('Creating Final Four...');
  const round5Date = new Date(baseDate);
  round5Date.setDate(round5Date.getDate() + 10);

  for (let i = 0; i < 2; i++) {
    const matchDate = new Date(round5Date);
    matchDate.setHours(matchDate.getHours() + i * 4);

    await prisma.match.create({
      data: {
        round: 5,
        matchNumber: matchNumber++,
        team1: 'TBD',
        team2: 'TBD',
        matchDate,
        completed: false,
      },
    });
  }

  // Round 6 - Championship (1 match)
  console.log('Creating Championship...');
  const championshipDate = new Date(baseDate);
  championshipDate.setDate(championshipDate.getDate() + 12);

  await prisma.match.create({
    data: {
      round: 6,
      matchNumber: matchNumber++,
      team1: 'TBD',
      team2: 'TBD',
      matchDate: championshipDate,
      completed: false,
    },
  });

  console.log(`✅ Created ${matchNumber - 1} matches`);

  // Add a few completed matches with results for demonstration
  console.log('Adding sample completed matches...');
  const matches = await prisma.match.findMany({
    where: { round: 1 },
    take: 3,
  });

  if (matches.length >= 3) {
    // First completed match - Nebraska vs Montana State
    const match1 = matches[0];
    await prisma.match.update({
      where: { id: match1.id },
      data: {
        completed: true,
        winner: 'team1',
      },
    });

    await prisma.set.createMany({
      data: [
        { matchId: match1.id, setNumber: 1, team1Score: 25, team2Score: 22 },
        { matchId: match1.id, setNumber: 2, team1Score: 25, team2Score: 20 },
        { matchId: match1.id, setNumber: 3, team1Score: 25, team2Score: 23 },
      ],
    });

    await prisma.prediction.create({
      data: {
        userId: user1.id,
        matchId: match1.id,
        predictedWinner: 'team1',
        predictedTotalSets: 3,
        pointsEarned: 15,
      },
    });

    // Second completed match
    const match2 = matches[1];
    await prisma.match.update({
      where: { id: match2.id },
      data: {
        completed: true,
        winner: 'team2',
      },
    });

    await prisma.set.createMany({
      data: [
        { matchId: match2.id, setNumber: 1, team1Score: 23, team2Score: 25 },
        { matchId: match2.id, setNumber: 2, team1Score: 25, team2Score: 22 },
        { matchId: match2.id, setNumber: 3, team1Score: 20, team2Score: 25 },
        { matchId: match2.id, setNumber: 4, team1Score: 22, team2Score: 25 },
      ],
    });

    await prisma.prediction.createMany({
      data: [
        {
          userId: user1.id,
          matchId: match2.id,
          predictedWinner: 'team1',
          predictedTotalSets: 4,
          pointsEarned: 5,
        },
        {
          userId: user2.id,
          matchId: match2.id,
          predictedWinner: 'team2',
          predictedTotalSets: 4,
          pointsEarned: 15,
        },
      ],
    });

    // Third match - upcoming with predictions
    const match3 = matches[2];
    await prisma.prediction.createMany({
      data: [
        {
          userId: user1.id,
          matchId: match3.id,
          predictedWinner: 'team1',
          predictedTotalSets: 3,
          pointsEarned: null,
        },
        {
          userId: user3.id,
          matchId: match3.id,
          predictedWinner: 'team2',
          predictedTotalSets: 5,
          pointsEarned: null,
        },
      ],
    });

    console.log('✅ Added sample match results and predictions');
  }

  // Show summary
  const userCount = await prisma.user.count();
  const matchCount = await prisma.match.count();
  const setCount = await prisma.set.count();
  const predictionCount = await prisma.prediction.count();

  console.log('\n📊 Seed Summary:');
  console.log(`   Users: ${userCount}`);
  console.log(`   Matches: ${matchCount}`);
  console.log(`   Sets: ${setCount}`);
  console.log(`   Predictions: ${predictionCount}`);
  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
