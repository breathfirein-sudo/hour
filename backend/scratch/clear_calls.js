const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearCalls() {
  try {
    const result = await prisma.callRequest.deleteMany({});
    console.log(`Successfully deleted ${result.count} callback request records.`);
  } catch (error) {
    console.error('Error clearing callback requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearCalls();
