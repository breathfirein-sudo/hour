const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const userId = 83;
  let wallet = await p.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await p.wallet.create({ data: { userId, balance: 40 } });
  } else {
    // If balance is 0, they probably didn't get the referral bonuses
    if (wallet.balance < 40) {
      await p.wallet.update({ where: { userId }, data: { balance: 40 } });
      console.log('Wallet balance updated to 40.');
    }
  }
  console.log('Final wallet:', await p.wallet.findUnique({ where: { userId } }));
  await p.$disconnect();
}
run();
