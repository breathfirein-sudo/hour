const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.update({ 
  where: { email: 'sandeepkumar.pikili@gmail.com' },
  data: { 
    isUnlocked: true,
    referralCount: 4
  }
}).then(u => {
  console.log('User updated:', u);
  return p.$disconnect();
});
