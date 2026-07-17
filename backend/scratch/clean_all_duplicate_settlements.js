const db = require('../db/index');

async function cleanAll() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('--- 1. Deleting duplicate transactions 544 and 545 (and any other known duplicates) ---');
    const dupCheck = await client.query('SELECT * FROM "Transaction" WHERE id IN (536, 537, 540, 541, 544, 545)');
    console.log('Found duplicates:', dupCheck.rows);

    if (dupCheck.rows.length > 0) {
      console.log('Deleting duplicate transactions...');
      await client.query('DELETE FROM "Transaction" WHERE id IN (536, 537, 540, 541, 544, 545)');
    }

    // Automatically detect and remove any OTHER duplicate TRADE_SETTLE transactions for any trade
    console.log('--- 2. Automatically scanning for any other duplicate TRADE_SETTLE transactions ---');
    const allSettle = await client.query(`
      SELECT id, "userId", asset, amount, details, "createdAt"
      FROM "Transaction"
      WHERE type = 'TRADE_SETTLE'
      ORDER BY "createdAt" ASC, id ASC
    `);

    const seenSettle = new Set();
    const toDeleteIds = [];
    for (const tx of allSettle.rows) {
      // Create a key based on user, asset, amount, and exact second/minute of settlement
      const timeBucket = Math.floor(new Date(tx.createdAt).getTime() / 10000); // 10 second window
      const key = `${tx.userId}_${tx.asset}_${tx.amount}_${timeBucket}`;
      if (seenSettle.has(key)) {
        toDeleteIds.push(tx.id);
      } else {
        seenSettle.add(key);
      }
    }

    if (toDeleteIds.length > 0) {
      console.log('Deleting auto-detected duplicate settlement transaction IDs:', toDeleteIds);
      await client.query(`DELETE FROM "Transaction" WHERE id = ANY($1::int[])`, [toDeleteIds]);
    }

    console.log('--- 3. Auditing all trades in the database for correct wallet_balance_after ---');
    const allTrades = await client.query('SELECT id, user_id, status, wallet_balance_before, returned_amount, wallet_balance_after FROM trades ORDER BY id ASC');
    
    for (const t of allTrades.rows) {
      if (t.status !== 'OPEN') {
        const correctAfter = (parseFloat(t.wallet_balance_before || 0) + parseFloat(t.returned_amount || 0)).toFixed(2);
        if (parseFloat(t.wallet_balance_after || 0).toFixed(2) !== correctAfter) {
          console.log(`Fixing trade ID ${t.id} (user ${t.user_id}): wallet_balance_after ${t.wallet_balance_after} -> ${correctAfter}`);
          await client.query('UPDATE trades SET wallet_balance_after = $1 WHERE id = $2', [correctAfter, t.id]);
        }
      }
    }

    console.log('--- 4. Syncing each user Wallet.balance to their latest completed trade balance ---');
    const usersRes = await client.query('SELECT DISTINCT user_id FROM trades WHERE user_id IS NOT NULL');
    for (const u of usersRes.rows) {
      const latestTradeRes = await client.query(`
        SELECT id, status, wallet_balance_before, returned_amount, wallet_balance_after 
        FROM trades 
        WHERE user_id = $1 AND status != 'OPEN' 
        ORDER BY id DESC LIMIT 1
      `, [u.user_id]);

      if (latestTradeRes.rows.length > 0) {
        const latest = latestTradeRes.rows[0];
        const authoritativeBalance = (parseFloat(latest.wallet_balance_before || 0) + parseFloat(latest.returned_amount || 0)).toFixed(2);
        console.log(`User ${u.user_id}: Setting Wallet balance to exactly ₹${authoritativeBalance} (from Trade ${latest.id})`);
        await client.query('UPDATE "Wallet" SET balance = $1 WHERE "userId" = $2', [authoritativeBalance, u.user_id]);
      }
    }

    await client.query('COMMIT');
    console.log('--- SUCCESS: All duplicate settlements cleaned and all user balances 100% reconciled ---');

    console.log('=== VERIFYING USER 87 CURRENT WALLET ===');
    const w = await client.query('SELECT * FROM "Wallet" WHERE "userId" = 87');
    console.log(w.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

cleanAll();
