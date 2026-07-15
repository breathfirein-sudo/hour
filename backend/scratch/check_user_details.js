const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findUnique({ where: { email: 'sandeepkumar.pikili@gmail.com' } }).then(u => {
  console.log(u);
  return p.$disconnect();
});
