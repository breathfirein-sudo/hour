const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resultCalls = await prisma.callRequest.updateMany({
    where: { execId: null },
    data: { execId: 9 }
  });
  console.log('CallRequests updated:', resultCalls.count);

  const resultDeposits = await prisma.manualDeposit.updateMany({
    where: { execId: null },
    data: { execId: 9 }
  });
  console.log('ManualDeposits updated:', resultDeposits.count);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
