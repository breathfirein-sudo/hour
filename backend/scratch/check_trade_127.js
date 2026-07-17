const db = require('../db/index');

async function check127() {
  const client = await db.connect();
  try {
    console.log('=== WALLET ===');
    const w = await client.query('SELECT * FROM "Wallet" WHERE "userId" = 87');
    console.log(w.rows[0]);

    console.log('=== TRADES ID >= 125 ===');
    const t = await client.query('SELECT id, symbol, type, status, investment_amount, returned_amount, pnl, wallet_balance_before, wallet_balance_after, timestamp FROM trades WHERE user_id = 87 AND id >= 125 ORDER BY id DESC');
    console.table(t.rows);

    console.log('=== TRANSACTIONS ID >= 538 ===');
    const tx = await client.query('SELECT id, type, asset, amount, details, "createdAt" FROM "Transaction" WHERE "userId" = 87 AND id >= 538 ORDER BY id ASC');
    console.table(tx.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

check127();
