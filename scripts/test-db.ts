import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Try to connect
    await prisma.$connect();
    console.log('✓ Connected to database successfully!');

    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`✓ Found ${userCount} users in database`);

    const matchCount = await prisma.match.count();
    console.log(`✓ Found ${matchCount} matches in database`);

  } catch (error) {
    console.error('✗ Database connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
