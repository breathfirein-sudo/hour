const db = require('../db/index');

async function check() {
  const client = await db.connect();
  try {
    console.log('=== TRADE 125 ===');
    const t = await client.query('SELECT * FROM trades WHERE id = 125');
    console.log(t.rows[0]);

    console.log('=== TX 534 to 537 ===');
    const tx = await client.query('SELECT * FROM "Transaction" WHERE id BETWEEN 534 AND 537 ORDER BY id ASC');
    console.table(tx.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

check();
