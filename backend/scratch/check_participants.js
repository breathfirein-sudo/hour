const db = require('../db');

async function checkParticipants() {
  try {
    const { rows } = await db.query('SELECT name, email FROM contest_participants');
    console.log(`Remaining participants in DB (${rows.length}):`);
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkParticipants();
