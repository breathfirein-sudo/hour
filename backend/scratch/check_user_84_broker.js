const db = require('../db');
async function run() {
  const res = await db.query('SELECT id, email, name, "isBroker", "brokerStatus", "brokerCommissionRate" FROM "User" WHERE id = 84 OR email ILIKE \'%kshivaprasad%\'');
  console.log('USER:', res.rows);
  const br = await db.query('SELECT * FROM "BrokerRequest" WHERE "userId" = 84 OR email ILIKE \'%kshivaprasad%\'');
  console.log('BROKER REQUESTS:', br.rows);
  process.exit(0);
}
run();
