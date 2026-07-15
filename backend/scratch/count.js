const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.manualDeposit.updateMany({
    where: { status: 'Pending' },
    data: { execId: null }
  });
  console.log('Reset deposits:', result.count);
}
main().finally(() => prisma.$disconnect());
