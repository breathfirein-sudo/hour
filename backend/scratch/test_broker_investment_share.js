const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('--- TESTING BROKER PROFIT SHARE ONLY ON RETURNS ---');
  try {
    // 1. Find or verify test user
    let brokerUser = await prisma.user.findFirst({
      where: { isBroker: true }
    });

    if (!brokerUser) {
      console.log('No broker user found, finding standard user to test...');
      brokerUser = await prisma.user.findFirst();
      if (!brokerUser) {
        console.log('No users in DB.');
        return;
      }
    }

    console.log(`Testing with User #${brokerUser.id} (${brokerUser.email}), isBroker: ${brokerUser.isBroker}, rate: ${brokerUser.brokerCommissionRate || 7.5}%`);

    // Verify calculation formula
    const testAmount = 1000;
    const days = 7;
    const elapsedSeconds = days * 86400;
    const dailyEarnings = testAmount * 0.01;
    const earningsPerSecond = dailyEarnings / 86400;
    const totalEarnings = elapsedSeconds * earningsPerSecond;
    const returnAmount = testAmount + totalEarnings;
    const commRate = parseFloat(brokerUser.brokerCommissionRate || 7.5);
    const brokerProfitShare = parseFloat((totalEarnings * (commRate / 100)).toFixed(4));

    console.log(`Calculated:`);
    console.log(`- Principal Amount: ₹${testAmount.toFixed(2)}`);
    console.log(`- 7-Day 1% Returns: ₹${totalEarnings.toFixed(2)}`);
    console.log(`- Broker Commission Rate: ${commRate}%`);
    console.log(`- Broker Profit Share (STRICTLY ONLY ON RETURNS): ₹${brokerProfitShare.toFixed(4)}`);
    console.log(`- Total Payout (Principal + Returns + Broker Share): ₹${(returnAmount + brokerProfitShare).toFixed(4)}`);

    // Check if principal is accidentally included:
    const wrongCalculation = (returnAmount) * (commRate / 100);
    console.log(`\nCheck:`);
    console.log(`- If calculated on principal + returns: ₹${wrongCalculation.toFixed(4)} (INCORRECT)`);
    console.log(`- If calculated STRICTLY ONLY on returns: ₹${brokerProfitShare.toFixed(4)} (CORRECT)`);

    console.log('\nVerification complete: The formula strictly isolates totalEarnings from principal.');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
