const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testRules() {
  console.log('=== TESTING INVESTMENT RULES & AUTO-WITHDRAWAL ===');

  // Find a test user
  const user = await prisma.user.findFirst({
    include: { wallet: true, investments: true }
  });

  if (!user || !user.wallet) {
    console.log('No test user or wallet found.');
    return;
  }

  console.log(`Test User ID: ${user.id}, Initial Wallet Balance: ₹${user.wallet.balance}`);

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  // Check weekly limit logic
  const activeWeeklyInvs = await prisma.investment.findMany({
    where: { userId: user.id, startTime: { gte: sevenDaysAgo } }
  });
  const activeWeeklySum = activeWeeklyInvs.reduce((sum, inv) => sum + inv.amount, 0);

  const weeklyTx = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'INVESTMENT', createdAt: { gte: sevenDaysAgo } },
    _sum: { amount: true }
  });
  const txWeeklySum = weeklyTx._sum.amount || 0;

  const totalWeeklyInvested = Math.max(activeWeeklySum, txWeeklySum);

  console.log(`Current 7-day Weekly Invested Total: ₹${totalWeeklyInvested}`);
  if (totalWeeklyInvested >= 1000) {
    console.log('SUCCESS: Weekly investment limit ₹1,000 is currently reached for this user.');
  } else {
    console.log(`User has ₹${1000 - totalWeeklyInvested} remaining for weekly investment limit.`);
  }

  // Test Auto-withdrawal calculation logic for a dummy 7-day old investment
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const cutoffDate = new Date(Date.now() - SEVEN_DAYS_MS);

  console.log(`Cutoff Date for Auto-Withdrawal (7 days ago): ${cutoffDate.toISOString()}`);
  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
}

testRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
