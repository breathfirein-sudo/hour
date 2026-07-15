const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const db = require('../db');

async function verifyRemoval() {
  const email = 'testuser@example.com';
  console.log(`Verifying removal for ${email}...`);

  const user = await prisma.user.findUnique({ where: { email } });
  const cp = await db.query('SELECT * FROM contest_participants WHERE email = $1', [email]);
  const ct = await db.query('SELECT * FROM contest_trades WHERE user_email = $1', [email]);
  const tr = await db.query('SELECT * FROM trades WHERE user_email = $1', [email]);

  console.log(`Prisma User exists: ${!!user}`);
  console.log(`Contest Participants count: ${cp.rowCount}`);
  console.log(`Contest Trades count: ${ct.rowCount}`);
  console.log(`Raw Trades count: ${tr.rowCount}`);

  process.exit(0);
}

verifyRemoval();
