import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBrackets() {
  try {
    console.log('Verifying bracket submission status...\n');

    // Count total users
    const totalUsers = await prisma.user.count();

    // Count submitted brackets
    const submittedCount = await prisma.user.count({
      where: {
        bracketSubmitted: true,
      },
    });

    // Count unsubmitted brackets
    const unsubmittedCount = await prisma.user.count({
      where: {
        bracketSubmitted: false,
      },
    });

    console.log('📊 Bracket Status Summary:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   ✅ Submitted: ${submittedCount}`);
    console.log(`   ❌ Unsubmitted: ${unsubmittedCount}\n`);

    if (unsubmittedCount === 0) {
      console.log('✅ SUCCESS: All brackets are submitted!');
      console.log('✅ All users are locked from making further changes.\n');
    } else {
      console.log('⚠️  WARNING: Some brackets are still unsubmitted\n');

      const unsubmittedUsers = await prisma.user.findMany({
        where: {
          bracketSubmitted: false,
        },
        select: {
          email: true,
          displayName: true,
        },
      });

      console.log('Unsubmitted users:');
      unsubmittedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.displayName || user.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verifying brackets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyBrackets()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
