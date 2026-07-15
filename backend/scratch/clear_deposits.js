const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDeposits() {
  try {
    const result = await prisma.manualDeposit.deleteMany({});
    console.log(`Successfully deleted ${result.count} manual deposit records.`);
  } catch (error) {
    console.error('Error clearing manual deposits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDeposits();
