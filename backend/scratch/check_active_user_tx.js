const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        transactions: {
          some: {
            asset: { in: ['chromium', 'Chromium', 'titanium', 'Titanium'] }
          }
        }
      },
      include: {
        wallet: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      console.log('No user with Chromium/Titanium transactions found.');
      // Find latest active user
      const latestUser = await prisma.user.findFirst({
        orderBy: { id: 'desc' },
        include: { wallet: true, transactions: { orderBy: { createdAt: 'desc' }, take: 10 } }
      });
      console.log('Latest User:', latestUser?.id, latestUser?.email);
      console.log('Transactions:', latestUser?.transactions);
      return;
    }

    console.log(`User ID: ${user.id}, Email: ${user.email}`);
    console.log('Wallet Balance in DB:', user.wallet?.balance);
    console.log('--- Transactions in DB ---');
    user.transactions.forEach(t => {
      console.log(`ID: ${t.id} | Type: ${t.type} | Asset: "${t.asset}" | Amount: ${t.amount} | Details: "${t.details}" | CreatedAt: ${t.createdAt}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
