const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const execs = await prisma.supportExecutive.findMany();
  console.log("EXECUTIVES:", execs);
  const requests = await prisma.callRequest.findMany();
  console.log("CALL REQUESTS:", requests);
}

main().catch(console.error).finally(() => prisma.$disconnect());
