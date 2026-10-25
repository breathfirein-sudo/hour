const db = require('../db');
async function fix() {
  await db.query(`UPDATE "BrokerRequest" SET "customerId" = 'CUST-84' WHERE "userId" = 84 AND status = 'Cancelled'`);
  console.log('Fixed User 84 cancelled BrokerRequest to CUST-84');
  process.exit(0);
}
fix();
