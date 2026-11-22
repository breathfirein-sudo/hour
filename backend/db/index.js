const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Prevent unhandled error event from crashing the server when connection to db is reset
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message || err);
});

// Auto-initialize the trades table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 4) NOT NULL,
    type VARCHAR(4) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS status VARCHAR(10) DEFAULT 'OPEN';
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS expiry_time TIMESTAMP;
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_price DECIMAL(10, 2);
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS investment_amount DECIMAL(18, 2) DEFAULT 0.00;
  ALTER TABLE trades ADD COLUMN IF NOT EXISTS pnl DECIMAL(18, 2) DEFAULT 0.00;

  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" INTEGER;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBroker" BOOLEAN DEFAULT FALSE;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerStatus" VARCHAR(50) DEFAULT 'None';
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerCommissionRate" DOUBLE PRECISION DEFAULT 7.5;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brokerEarnings" DOUBLE PRECISION DEFAULT 0.0;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalBrokerSpent" DOUBLE PRECISION DEFAULT 0.0;
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalBrokerClaimed" DOUBLE PRECISION DEFAULT 0.0;

  CREATE TABLE IF NOT EXISTS contest_participants (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    balance DECIMAL(18, 2) DEFAULT 11000.00,
    total_trades INTEGER DEFAULT 0,
    profit_trades INTEGER DEFAULT 0,
    loss_trades INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2) DEFAULT 0.00,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contest_trades (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES contest_participants(email) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    type VARCHAR(10) NOT NULL,
    status VARCHAR(10) DEFAULT 'OPEN',
    entry_amount DECIMAL(18, 2) NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    close_price DECIMAL(18, 8),
    pnl DECIMAL(18, 2) DEFAULT 0.00,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS device_orders (
    id VARCHAR(60) PRIMARY KEY,
    user_id INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
    order_type VARCHAR(30) DEFAULT 'BUY',
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    condition VARCHAR(50) DEFAULT 'New',
    ram VARCHAR(50) NOT NULL,
    storage VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    base_price DECIMAL(18, 2) NOT NULL,
    warranty_fee DECIMAL(18, 2) DEFAULT 0.00,
    total_amount DECIMAL(18, 2) NOT NULL,
    has_warranty BOOLEAN DEFAULT FALSE,
    warranty_valid_until TIMESTAMP,
    imei VARCHAR(100),
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    admin_notes TEXT,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    alternate_phone VARCHAR(30),
    email VARCHAR(255) NOT NULL,
    house_number VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    landmark VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(20) NOT NULL,
    delivery_instructions TEXT,
    inspection_passed BOOLEAN,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_device_orders_user_id ON device_orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_device_orders_email ON device_orders(email);
  CREATE INDEX IF NOT EXISTS idx_device_orders_status ON device_orders(status);

  ALTER TABLE device_orders ADD COLUMN IF NOT EXISTS billing_date TIMESTAMP;
  ALTER TABLE device_orders ADD COLUMN IF NOT EXISTS original_invoice_price DECIMAL(18, 2);
  ALTER TABLE device_orders ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5, 2);
  ALTER TABLE device_orders ADD COLUMN IF NOT EXISTS invoice_document TEXT;
  ALTER TABLE device_orders ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMP;
`).catch(err => console.error('Error auto-creating database tables:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
