import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupDatabase() {
  try {
    console.log('Starting database backup...');

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    fs.mkdirSync(backupPath);

    // Backup Users
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(backupPath, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`✓ Backed up ${users.length} users`);

    // Backup Matches
    const matches = await prisma.match.findMany();
    fs.writeFileSync(
      path.join(backupPath, 'matches.json'),
      JSON.stringify(matches, null, 2)
    );
    console.log(`✓ Backed up ${matches.length} matches`);

    // Backup Predictions
    const predictions = await prisma.prediction.findMany();
    fs.writeFileSync(
      path.join(backupPath, 'predictions.json'),
      JSON.stringify(predictions, null, 2)
    );
    console.log(`✓ Backed up ${predictions.length} predictions`);

    console.log(`\n✅ Backup complete! Saved to: ${backupPath}`);
    console.log('\nSummary:');
    console.log(`  Users: ${users.length}`);
    console.log(`  Matches: ${matches.length}`);
    console.log(`  Predictions: ${predictions.length}`);

  } catch (error) {
    console.error('Error during backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
