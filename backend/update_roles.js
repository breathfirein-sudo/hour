const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.supportExecutive.updateMany({
    data: {
      role: 'Both'
    }
  });
  console.log('Updated roles:', result.count);
}
main().finally(() => prisma.$disconnect());
