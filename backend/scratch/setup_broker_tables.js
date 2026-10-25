const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Connected to PostgreSQL. Adding broker columns to User table...");
    
    await client.query(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBroker" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerStatus" VARCHAR(50) DEFAULT 'None';
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerCommissionRate" DOUBLE PRECISION DEFAULT 7.5;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerEarnings" DOUBLE PRECISION DEFAULT 0.0;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalBrokerSpent" DOUBLE PRECISION DEFAULT 0.0;
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalBrokerClaimed" DOUBLE PRECISION DEFAULT 0.0;
    `);

    console.log("Creating BrokerRequest table if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "BrokerRequest" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "customerId" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(50) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "subscriptionFee" DOUBLE PRECISION DEFAULT 1000.0,
        "commissionRate" DOUBLE PRECISION DEFAULT 7.5,
        "status" VARCHAR(50) DEFAULT 'Pending',
        "adminNotes" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Successfully setup broker schema in database!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
