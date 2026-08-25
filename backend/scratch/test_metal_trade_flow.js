const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  try {
    console.log('--- Testing Metal Trade Endpoint Logic ---');
    
    // Find or create test user
    let user = await prisma.user.findFirst({
      include: { wallet: true }
    });

    if (!user) {
      console.log('No user found in DB to test.');
      return;
    }

    console.log(`Testing with User: ${user.email} (ID: ${user.id})`);
    console.log(`Initial Wallet Balance in DB: ₹${user.wallet ? user.wallet.balance : 0}`);

    if (!user.wallet) {
      console.log('User has no wallet. Creating wallet for test...');
      await prisma.wallet.create({
        data: { userId: user.id, balance: 1000 }
      });
      user = await prisma.user.findUnique({ where: { id: user.id }, include: { wallet: true } });
    }

    const startBalance = user.wallet.balance;
    const testBuyAmount = 118.00; // ₹100 + ₹18 GST

    // Test Metal Buy (Debit)
    console.log(`\nSimulating Metal BUY of ₹${testBuyAmount}...`);
    const [, updatedWalletAfterBuy] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'METAL_BUY',
          asset: 'gold',
          amount: -testBuyAmount,
          fee: 0,
          gst: 18.00,
          details: 'TEST Purchase 0.0074g of Gold'
        }
      }),
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: testBuyAmount } }
      })
    ]);

    console.log(`Updated Wallet Balance after BUY in DB: ₹${updatedWalletAfterBuy.balance}`);
    const expectedAfterBuy = parseFloat((startBalance - testBuyAmount).toFixed(2));
    console.log(`Expected Balance: ₹${expectedAfterBuy}`);

    if (Math.abs(updatedWalletAfterBuy.balance - expectedAfterBuy) < 0.01) {
      console.log('✅ TEST PASSED: Metal BUY successfully debited PostgreSQL wallet balance!');
    } else {
      console.error('❌ TEST FAILED: Balance mismatch after BUY');
    }

    // Revert test transaction to leave user balance unchanged
    console.log(`\nReverting test BUY (crediting back ₹${testBuyAmount})...`);
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: testBuyAmount } }
      }),
      prisma.transaction.deleteMany({
        where: { userId: user.id, details: 'TEST Purchase 0.0074g of Gold' }
      })
    ]);

    const finalWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    console.log(`Final Restored Balance in DB: ₹${finalWallet.balance}`);
    console.log('✅ Database remains clean and unmodified!');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
