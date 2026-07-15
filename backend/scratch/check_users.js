const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany().then(u => {
  console.log('Total users:', u.length);
  console.log(u.map(x => x.email));
  return p.$disconnect();
});
