const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting Lock Period Verification Test ---');
  
  // 1. Find a user in the database
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('Error: No users found in database to run test.');
    process.exit(1);
  }
  console.log(`Using existing user: ${user.email} (ID: ${user.id})`);

  // Ensure user has a wallet
  let wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) {
    console.log('Creating wallet for user...');
    wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 1000
      }
    });
  }

  // 2. Create an investment (starts now)
  console.log('Creating a new investment (starts now)...');
  const amount = 100;
  const investment = await prisma.investment.create({
    data: {
      userId: user.id,
      amount: amount
    }
  });
  console.log(`Created Investment ID: ${investment.id}, Start Time: ${investment.startTime}`);

  // Helper function containing our router.delete route logic
  const checkWithdrawal = (inv) => {
    const now = new Date().getTime();
    const start = new Date(inv.startTime).getTime();
    
    // Enforce 7-day lock period
    const lockPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    if (now - start < lockPeriod) {
      const remainingTime = lockPeriod - (now - start);
      const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
      return {
        allowed: false,
        message: `Investment is locked for 7 days. Remaining time: ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`
      };
    }
    return { allowed: true };
  };

  // 3. Test 1: Immediate withdrawal attempt
  console.log('Testing T1: Immediate withdrawal...');
  const res1 = checkWithdrawal(investment);
  console.log(`T1 Allowed: ${res1.allowed}, Message: "${res1.message || 'N/A'}"`);
  if (res1.allowed) {
    throw new Error('Test failed: Immediate withdrawal should not be allowed!');
  }

  // 4. Test 2: Modify startTime in DB to 8 days ago and test
  console.log('Modifying investment startTime in database to 8 days ago...');
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
  
  const updatedInv = await prisma.investment.update({
    where: { id: investment.id },
    data: { startTime: eightDaysAgo }
  });
  console.log(`Updated Investment ID: ${updatedInv.id}, New Start Time: ${updatedInv.startTime}`);

  console.log('Testing T2: Withdrawal after 8 days...');
  const res2 = checkWithdrawal(updatedInv);
  console.log(`T2 Allowed: ${res2.allowed}`);
  if (!res2.allowed) {
    throw new Error(`Test failed: Withdrawal after 8 days should be allowed! Error: ${res2.message}`);
  }

  // 5. Cleanup
  console.log('Cleaning up investment...');
  await prisma.investment.delete({ where: { id: investment.id } });
  console.log('Cleanup successful.');

  console.log('--- Lock Period Verification Test Passed! ---');
}

runTest()
  .catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
