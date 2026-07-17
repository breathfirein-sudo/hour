const db = require('../db/index');

async function syncAndClean() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('--- 1. Checking current user 87 Wallet balance ---');
    const wRes = await client.query('SELECT * FROM "Wallet" WHERE "userId" = 87');
    console.log('Current Wallet Row:', wRes.rows[0]);

    console.log('--- 2. Checking trade 125 before cleanup ---');
    const tRes = await client.query('SELECT id, status, investment_amount, returned_amount, wallet_balance_before, wallet_balance_after FROM trades WHERE id = 125');
    console.log('Trade 125:', tRes.rows[0]);

    // Check if duplicate transactions 536 and 537 exist for trade 125
    const dupTx = await client.query(`
      SELECT id, type, asset, amount, details, "createdAt" 
      FROM "Transaction" 
      WHERE id IN (536, 537) AND details ILIKE '%Standard Paper Trade settlement credit: LOST%'
    `);
    console.log('Duplicate Transactions found:', dupTx.rows);

    if (dupTx.rows.length === 2) {
      console.log('Deleting duplicate transactions 536 and 537 from zombie triple-settlement...');
      await client.query('DELETE FROM "Transaction" WHERE id IN (536, 537)');
    }

    // Correct wallet_balance_after for trade 125: 834.87 + 89.00 = 923.87
    const correctAfter = (parseFloat(tRes.rows[0].wallet_balance_before || 0) + parseFloat(tRes.rows[0].returned_amount || 0)).toFixed(2);
    console.log(`Setting correct wallet_balance_after on trade 125 to ${correctAfter}...`);
    await client.query('UPDATE trades SET wallet_balance_after = $1 WHERE id = 125', [correctAfter]);

    console.log(`Setting Wallet balance for userId 87 to ${correctAfter}...`);
    await client.query('UPDATE "Wallet" SET balance = $1 WHERE "userId" = 87', [correctAfter]);

    await client.query('COMMIT');
    console.log('--- SUCCESS: Database Wallet and Trade 125 synced to exactly ₹923.87 ---');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in syncAndClean:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

syncAndClean();
