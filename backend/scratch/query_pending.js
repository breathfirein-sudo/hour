const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.supportSession.findMany({ where: { status: 'Pending' } })
  .then(console.log)
  .finally(() => prisma.$disconnect());
