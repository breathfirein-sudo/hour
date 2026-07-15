const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const codeWithoutPrefix = 'sandeepkumar.pikili';
  const allUsers = await p.user.findMany({
    where: {
      email: {
        startsWith: codeWithoutPrefix + '@',
        mode: 'insensitive'
      }
    },
    take: 1
  });
  console.log(allUsers);
  await p.$disconnect();
}
run();
