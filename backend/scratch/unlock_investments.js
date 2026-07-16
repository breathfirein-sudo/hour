const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function unlockAll() {
  console.log('--- Unlocking All Investments ---');
  
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  const result = await prisma.investment.updateMany({
    data: {
      startTime: eightDaysAgo
    }
  });

  console.log(`Successfully updated ${result.count} investment(s) to a start time of 8 days ago (${eightDaysAgo.toLocaleString()}).`);
  console.log('They should now appear as Unlocked in the UI.');
}

unlockAll()
  .catch(err => {
    console.error('Error unlocking investments:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
