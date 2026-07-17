const db = require('../db');

const getExpiryMs = (interval) => {
  if (!interval) return 60000; // default 1m
  if (interval.includes('m')) return parseInt(interval) * 60000;
  if (interval.includes('h')) return parseInt(interval) * 3600000;
  if (interval.includes('D')) return parseInt(interval) * 86400000;
  if (interval.includes('W')) return parseInt(interval) * 604800000;
  if (interval.includes('M')) return parseInt(interval) * 2592000000;
  if (interval.includes('R')) return 60000;
  return 60000;
};

// Helper to anonymize email
const anonymizeEmail = (email) => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name}***@${domain}`;
  }
  return `${name.substring(0, 2)}***${name.substring(name.length - 1)}@${domain}`;
};

// Register user for contest
exports.register = async (req, res) => {
  const email = req.user.email.toLowerCase();
  const name = req.user.name || email.split('@')[0];

  try {
    const { rows: existing } = await db.query(
      'SELECT * FROM contest_participants WHERE email = $1',
      [email]
    );

    if (existing.length > 0) {
      return res.status(200).json({ success: true, message: 'Already registered', participant: existing[0] });
    }

    const { rows: inserted } = await db.query(
      'INSERT INTO contest_participants (email, name, balance) VALUES ($1, $2, 11000.00) RETURNING *',
      [email, name]
    );

    res.status(201).json({ success: true, message: 'Registered successfully', participant: inserted[0] });
  } catch (error) {
    console.error('Error registering for contest:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
};

// Fetch user's contest profile stats and trades
exports.getProfile = async (req, res) => {
  const email = req.user.email.toLowerCase();

  try {
    const { rows: participant } = await db.query(
      'SELECT * FROM contest_participants WHERE email = $1',
      [email]
    );

    if (participant.length === 0) {
      return res.status(200).json({ success: true, registered: false });
    }

    const { rows: trades } = await db.query(
      'SELECT * FROM contest_trades WHERE user_email = $1 ORDER BY timestamp DESC LIMIT 50',
      [email]
    );

    res.status(200).json({
      success: true,
      registered: true,
      profile: participant[0],
      trades: trades
    });
  } catch (error) {
    console.error('Error fetching contest profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contest profile' });
  }
};

// Fetch user's contest trades
exports.getTrades = async (req, res) => {
  const email = req.user.email.toLowerCase();
  try {
    const { rows } = await db.query(
      'SELECT * FROM contest_trades WHERE user_email = $1 ORDER BY timestamp DESC',
      [email]
    );
    res.status(200).json({ success: true, trades: rows });
  } catch (error) {
    console.error('Error fetching contest trades:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contest trades' });
  }
};

// Place contest trade
exports.placeTrade = async (req, res) => {
  const email = req.user.email.toLowerCase();
  const { symbol, price, type, entryAmount, interval } = req.body;

  if (!symbol || !price || !type || !entryAmount || !interval) {
    return res.status(400).json({ success: false, error: 'Missing trade parameters' });
  }

  const amt = parseFloat(entryAmount);
  if (isNaN(amt) || amt !== 100) {
    return res.status(400).json({ success: false, error: 'Trade amount must be exactly 100 rupees' });
  }

  const riskAmount = 11;
  const adminFee = 1;

  try {
    // 1. Get participant to verify balance
    const { rows: participant } = await db.query(
      'SELECT * FROM contest_participants WHERE email = $1',
      [email]
    );

    if (participant.length === 0) {
      return res.status(400).json({ success: false, error: 'User is not registered for the contest' });
    }

    const currentBalance = parseFloat(participant[0].balance);
    if (currentBalance < riskAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient contest wallet balance' });
    }

    // 2. Calculate quantity and expiry time
    const quantity = amt / parseFloat(price);
    const ms = getExpiryMs(interval);
    const expiryTime = new Date(Date.now() + ms).toISOString();

    // 3. Deduct balance in transaction on a checked-out client
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Deduct 11 from the user's contest balance
      await client.query(
        'UPDATE contest_participants SET balance = balance - $1 WHERE email = $2',
        [riskAmount, email]
      );

      // Add 1 to the superadmin's main Wallet
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.user.update({
        where: { email: 'sandeepkumar.pikili@vrpigroup.co.in' },
        data: {
          wallet: {
            update: {
              balance: { increment: adminFee }
            }
          }
        }
      });

      const { rows: inserted } = await client.query(
        `INSERT INTO contest_trades (user_email, symbol, price, quantity, type, status, entry_amount, expiry_time) 
         VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7) RETURNING *`,
        [email, symbol, price, quantity, type.toUpperCase(), amt, expiryTime]
      );

      await client.query('COMMIT');

      res.status(201).json({ success: true, message: 'Contest trade placed successfully', trade: inserted[0] });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error placing contest trade:', error);
    res.status(500).json({ success: false, error: 'Trade execution failed: ' + error.message });
  }
};

// Fetch leaderboard (public access permitted but token verified for user relevance)
exports.getLeaderboard = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT name, email, balance, total_trades, profit_trades, loss_trades, success_rate 
       FROM contest_participants 
       WHERE email NOT LIKE '%@vbcontest.com'
       ORDER BY success_rate DESC, total_trades DESC, balance DESC 
       LIMIT 100`
    );

    // Anonymize emails for privacy
    const leaderboard = rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      email: anonymizeEmail(row.email),
      totalTrades: row.total_trades,
      profitTrades: row.profit_trades,
      lossTrades: row.loss_trades,
      successRate: parseFloat(row.success_rate),
      balance: parseFloat(row.balance)
    }));

    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard data' });
  }
};

// --- Super Admin Panel Operations ---

// Get all participants (Admin only)
exports.adminGetParticipants = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM contest_participants ORDER BY total_trades DESC, success_rate DESC'
    );
    res.status(200).json({ success: true, participants: rows });
  } catch (error) {
    console.error('Admin get participants error:', error);
    res.status(500).json({ success: false, error: 'Admin query failed' });
  }
};

// Update participant stats/balance (Admin only)
exports.adminUpdateParticipant = async (req, res) => {
  const { email, balance, totalTrades, profitTrades, lossTrades, successRate } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Participant email required' });
  }

  try {
    await db.query(
      `UPDATE contest_participants 
       SET balance = $1, total_trades = $2, profit_trades = $3, loss_trades = $4, success_rate = $5 
       WHERE email = $6`,
      [
        parseFloat(balance),
        parseInt(totalTrades),
        parseInt(profitTrades),
        parseInt(lossTrades),
        parseFloat(successRate),
        email.toLowerCase()
      ]
    );

    res.status(200).json({ success: true, message: 'Participant record updated successfully' });
  } catch (error) {
    console.error('Admin update participant error:', error);
    res.status(500).json({ success: false, error: 'Update override failed' });
  }
};

// Reset participant's contest progress (Admin only)
exports.adminResetParticipant = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Participant email required' });
  }

  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Delete trades
      await client.query('DELETE FROM contest_trades WHERE user_email = $1', [email.toLowerCase()]);
      
      // Reset stats
      await client.query(
        `UPDATE contest_participants 
         SET balance = 11000.00, total_trades = 0, profit_trades = 0, loss_trades = 0, success_rate = 0.00 
         WHERE email = $1`,
        [email.toLowerCase()]
      );
      
      await client.query('COMMIT');
      res.status(200).json({ success: true, message: 'Participant progress reset successfully' });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin reset participant error:', error);
    res.status(500).json({ success: false, error: 'Reset failed' });
  }
};

// Get trades for a specific participant (Admin only)
exports.adminGetParticipantTrades = async (req, res) => {
  const { email } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM contest_trades WHERE user_email = $1 ORDER BY timestamp DESC',
      [email.toLowerCase()]
    );
    res.status(200).json({ success: true, trades: rows });
  } catch (error) {
    console.error('Admin get trades error:', error);
    res.status(500).json({ success: false, error: 'Admin query failed: ' + error.message });
  }
};

