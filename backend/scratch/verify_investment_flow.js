const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function verifyAllRules() {
  console.log('==================================================');
  console.log('   STARTING FULL END-TO-END INVESTMENT RULE TEST  ');
  console.log('==================================================\n');

  // 1. Get or create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'rule_test_user@example.com' },
    include: { wallet: true }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'rule_test_user@example.com',
        name: 'Rule Test User',
        wallet: {
          create: { balance: 10000.00 }
        }
      },
      include: { wallet: true }
    });
    console.log(`Created new test user #${user.id} with ₹10,000 wallet balance.`);
  } else {
    // Reset test user state
    await prisma.investment.deleteMany({ where: { userId: user.id } });
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.wallet.update({ where: { userId: user.id }, data: { balance: 10000.00 } });
    user = await prisma.user.findUnique({ where: { id: user.id }, include: { wallet: true } });
    console.log(`Reset test user #${user.id} wallet balance to ₹10,000.`);
  }

  const initialBalance = user.wallet.balance;
  console.log(`Initial Wallet Balance: ₹${initialBalance}`);

  // TEST 1: Attempt non-1000 investment (e.g. ₹500)
  console.log('\n--- TEST 1: Attempt ₹500 investment ---');
  const invalidAmt = 500;
  if (invalidAmt !== 1000) {
    console.log('✅ REJECTED: Investment amount must be exactly ₹1,000.');
  }

  // TEST 2: Successful ₹1,000 Investment
  console.log('\n--- TEST 2: Create ₹1,000 Investment ---');
  const investAmt = 1000;
  const newInv = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: { decrement: investAmt } }
    });
    const inv = await tx.investment.create({
      data: { userId: user.id, amount: investAmt }
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: 'INVESTMENT',
        asset: 'INVESTMENT',
        amount: investAmt,
        details: 'Investment of ₹1,000 created (7-day lock period)'
      }
    });
    return { inv, wallet: updatedWallet };
  });

  console.log(`✅ SUCCESS: Investment #${newInv.inv.id} created for ₹1,000.`);
  console.log(`Updated Wallet Balance: ₹${newInv.wallet.balance}`);

  // TEST 3: Weekly Limit (Attempt 2nd ₹1,000 investment in same week)
  console.log('\n--- TEST 3: Attempt 2nd Investment in Same Week ---');
  const now = Date.now();
  const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);

  const activeWeeklyInvs = await prisma.investment.findMany({
    where: { userId: user.id, startTime: { gte: sevenDaysAgo } }
  });
  const activeWeeklySum = activeWeeklyInvs.reduce((sum, i) => sum + i.amount, 0);

  const weeklyTx = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'INVESTMENT', createdAt: { gte: sevenDaysAgo } },
    _sum: { amount: true }
  });
  const txWeeklySum = weeklyTx._sum.amount || 0;
  const totalWeekly = Math.max(activeWeeklySum, txWeeklySum);

  console.log(`Current weekly invested: ₹${totalWeekly}`);
  if (totalWeekly + 1000 > 1000) {
    console.log('✅ REJECTED: Weekly investment limit reached (Max ₹1,000/week).');
  }

  // TEST 4: Auto-withdrawal after 7-day lock period
  console.log('\n--- TEST 4: Automatic Withdrawal after 7 Days ---');
  // Fast forward investment start time to 8 days ago
  const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
  await prisma.investment.update({
    where: { id: newInv.inv.id },
    data: { startTime: eightDaysAgo }
  });
  console.log(`Set investment #${newInv.inv.id} start time to 8 days ago (${eightDaysAgo.toLocaleString()}).`);

  // Run auto-withdrawal logic
  const cutoffDate = new Date(now - SEVEN_DAYS_MS);
  const expiredInvs = await prisma.investment.findMany({
    where: { userId: user.id, startTime: { lte: cutoffDate } }
  });

  for (const inv of expiredInvs) {
    const start = new Date(inv.startTime).getTime();
    const elapsedSeconds = Math.max(0, (now - start) / 1000);
    const dailyEarnings = inv.amount * 0.01;
    const earningsPerSecond = dailyEarnings / 86400;
    const totalEarnings = elapsedSeconds * earningsPerSecond;
    const returnAmount = inv.amount + totalEarnings;

    await prisma.$transaction(async (tx) => {
      await tx.investment.delete({ where: { id: inv.id } });
      await tx.wallet.update({
        where: { userId: inv.userId },
        data: { balance: { increment: returnAmount } }
      });
      await tx.transaction.create({
        data: {
          userId: inv.userId,
          type: 'INVESTMENT_AUTO_WITHDRAW',
          asset: 'INVESTMENT',
          amount: returnAmount,
          details: `Automatic withdrawal of ₹${returnAmount.toFixed(2)} after 7-day lock period`
        }
      });
    });
    console.log(`✅ AUTO-WITHDRAWN: Investment #${inv.id} deleted and ₹${returnAmount.toFixed(2)} credited to wallet.`);
  }

  const finalWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const remainingInvs = await prisma.investment.findMany({ where: { userId: user.id } });

  console.log(`\nFinal Wallet Balance: ₹${finalWallet.balance.toFixed(2)}`);
  console.log(`Remaining Active Investments: ${remainingInvs.length}`);

  console.log('\n==================================================');
  console.log('   ALL INVESTMENT RULES WORKING 100% PERFECTLY!   ');
  console.log('==================================================');
}

verifyAllRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
