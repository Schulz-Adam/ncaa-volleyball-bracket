import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColoradoMatch() {
  try {
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { team1: { contains: 'Colorado' } },
          { team2: { contains: 'Colorado' } },
        ],
      },
    });

    if (match) {
      console.log('Colorado Match Found:');
      console.log(JSON.stringify(match, null, 2));
    } else {
      console.log('No Colorado match found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColoradoMatch();
