const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const db = require('../db');

async function deleteTestUserCompletely() {
  const email = 'testuser@example.com';
  console.log(`Starting complete deletion of test user: ${email}...`);

  try {
    // 1. Delete from contest_trades and contest_participants raw SQL
    const ctDel = await db.query('DELETE FROM contest_trades WHERE user_email = $1', [email]);
    console.log(`Deleted ${ctDel.rowCount} contest_trades records.`);
    const cpDel = await db.query('DELETE FROM contest_participants WHERE email = $1', [email]);
    console.log(`Deleted ${cpDel.rowCount} contest_participants records.`);

    // 2. Delete from standard raw trades table
    const stDel = await db.query('DELETE FROM trades WHERE user_email = $1', [email]);
    console.log(`Deleted ${stDel.rowCount} raw trades records.`);

    // 3. Find Prisma User
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      console.log(`Found Prisma User ID: ${user.id}`);
      // Delete manual deposits, payments, transactions, positions, trades, wallet, support sessions, support messages, call requests
      await prisma.manualDeposit.deleteMany({ where: { userId: user.id } });
      await prisma.payment.deleteMany({ where: { userId: user.id } });
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.position.deleteMany({ where: { userId: user.id } });
      await prisma.trade.deleteMany({ where: { userId: user.id } });
      await prisma.wallet.deleteMany({ where: { userId: user.id } });
      
      // Delete user
      await prisma.user.delete({ where: { id: user.id } });
      console.log('Successfully deleted user and all related Prisma records.');
    } else {
      console.log('Prisma User record not found.');
    }

    // Also delete support sessions, messages, call requests matching email
    await prisma.supportMessage.deleteMany({ where: { userEmail: email } });
    await prisma.callRequest.deleteMany({ where: { userEmail: email } });
    await prisma.supportSession.deleteMany({ where: { userEmail: email } });
    console.log('Cleaned support messages, call requests, and support sessions.');

    process.exit(0);
  } catch (err) {
    console.error('Error during test user deletion:', err);
    process.exit(1);
  }
}

deleteTestUserCompletely();
