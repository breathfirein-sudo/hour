const db = require('../db');

async function clearDummyData() {
  try {
    console.log('Deleting mock trades...');
    const tradesResult = await db.query("DELETE FROM contest_trades WHERE user_email LIKE '%@vbcontest.com'");
    console.log(`Deleted ${tradesResult.rowCount} mock trades.`);

    console.log('Deleting mock participants...');
    const participantsResult = await db.query("DELETE FROM contest_participants WHERE email LIKE '%@vbcontest.com'");
    console.log(`Deleted ${participantsResult.rowCount} mock participants.`);

    process.exit(0);
  } catch (error) {
    console.error('Error clearing dummy data:', error);
    process.exit(1);
  }
}

clearDummyData();
