const db = require('../db/index');

async function audit() {
  const client = await db.connect();
  try {
    console.log('=== USER & WALLET ===');
    const userRes = await client.query(`
      SELECT u.id, u.email, w.balance as wallet_balance
      FROM "User" u
      JOIN "Wallet" w ON u.id = w."userId"
      WHERE u.email ILIKE '%shivaram%' OR u.email ILIKE '%test%'
    `);
    console.table(userRes.rows);

    console.log('=== LATEST 10 STANDARD TRADES ===');
    const tradesRes = await client.query(`
      SELECT *
      FROM trades
      ORDER BY id DESC
      LIMIT 5
    `);
    console.table(tradesRes.rows);

    console.log('=== LATEST 15 TRANSACTIONS ===');
    const txRes = await client.query(`
      SELECT id, type, asset, amount, fee, details, "createdAt"
      FROM "Transaction"
      ORDER BY id DESC
      LIMIT 15
    `);
    console.table(txRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

audit();
