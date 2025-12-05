import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function submitAllBrackets() {
  try {
    console.log('Starting bulk bracket submission...\n');

    // First, check how many unsubmitted brackets exist
    const unsubmittedCount = await prisma.user.count({
      where: {
        bracketSubmitted: false,
      },
    });

    console.log(`Found ${unsubmittedCount} unsubmitted brackets`);

    if (unsubmittedCount === 0) {
      console.log('No unsubmitted brackets to update.');
      return;
    }

    // Get details of users who haven't submitted
    const unsubmittedUsers = await prisma.user.findMany({
      where: {
        bracketSubmitted: false,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    console.log('\nUsers with unsubmitted brackets:');
    unsubmittedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName || user.email} (${user.email})`);
    });

    console.log('\n⚠️  This will mark ALL unsubmitted brackets as submitted.');
    console.log('⚠️  Users will no longer be able to make changes to their predictions.\n');

    // Update all unsubmitted brackets
    const result = await prisma.user.updateMany({
      where: {
        bracketSubmitted: false,
      },
      data: {
        bracketSubmitted: true,
        bracketSubmittedAt: new Date(),
      },
    });

    console.log(`✅ Successfully submitted ${result.count} brackets`);
    console.log(`✅ All users are now locked from making further changes\n`);

  } catch (error) {
    console.error('❌ Error submitting brackets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

submitAllBrackets()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
