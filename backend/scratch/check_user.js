const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'kshivaprasad' } },
    select: { id: true, email: true, name: true, isBroker: true, brokerStatus: true }
  });
  console.log('User matching kshivaprasad:', users);
}
run().finally(() => prisma.$disconnect());
