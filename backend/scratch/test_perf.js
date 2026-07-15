const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPerformance() {
  const exec = await prisma.supportExecutive.findFirst();
  if (!exec) return console.log("No exec found");
  
  const callsResponded = await prisma.callRequest.count({
    where: { status: { in: ['Connected', 'Closed'] } }
  });
  
  console.log("callsResponded from DB:", callsResponded);
}

testPerformance().finally(() => prisma.$disconnect());
