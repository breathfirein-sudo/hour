const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ where: { NOT: { email: { endsWith: '@gmail.com' } } } })
  .then(users => { 
    console.log(users.map(u => u.email)); 
    return p.$disconnect(); 
  });
