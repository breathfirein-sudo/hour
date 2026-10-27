const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/broker/request - Customer submits a partnership/broker application
router.post('/request', async (req, res) => {
  try {
    const { email, name, phone, customerId, subscriptionFee = 1000 } = req.body;

    if (!email || !name || !phone) {
      return res.status(400).json({ success: false, error: 'Name, phone, and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in User table
    const userResult = await db.query('SELECT * FROM "User" WHERE LOWER(email) = $1', [cleanEmail]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const user = userResult.rows[0];

    const finalCustomerId = customerId || `CUST-${user.id}`;

    // Check if an existing request is pending
    const existingReq = await db.query(
      'SELECT * FROM "BrokerRequest" WHERE "userId" = $1 AND "status" = $2',
      [user.id, 'Pending']
    );

    if (existingReq.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'You already have a pending partnership application under review.' 
      });
    }

    // Insert new BrokerRequest
    const insertResult = await db.query(
      `INSERT INTO "BrokerRequest" (
        "userId", "customerId", "name", "phone", "email", "subscriptionFee", "commissionRate", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
      [user.id, finalCustomerId, name, phone, cleanEmail, parseFloat(subscriptionFee) || 1000, 7.5, 'Pending']
    );

    // Update User table brokerStatus
    await db.query(
      'UPDATE "User" SET "brokerStatus" = $1 WHERE id = $2',
      ['Pending', user.id]
    );

    // Notify through socket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('new_broker_request', {
        requestId: insertResult.rows[0].id,
        customerId: finalCustomerId,
        name,
        email: cleanEmail,
        phone,
        subscriptionFee: 1000,
        createdAt: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Partnership request submitted successfully! Admin will review your application.',
      request: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error submitting broker request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit broker request.' });
  }
});

// GET /api/broker/status - Get current user broker status & live earnings
router.get('/status', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userResult = await db.query(
      'SELECT id, email, name, phone, "isBroker", "brokerStatus", "brokerCommissionRate", "brokerEarnings", "totalBrokerSpent", "totalBrokerClaimed" FROM "User" WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const u = userResult.rows[0];
    const brokerId = u.isBroker ? `CUST-B-${u.id}` : `CUST-${u.id}`;
    const commRate = parseFloat(u.brokerCommissionRate || 7.5);

    // Calculate live returns and broker profit share on active investments from referral users under this broker
    const invResult = await db.query(
      `SELECT i.id, i.amount, i."startTime", i."userId", u.email as "userEmail", u.name as "userName"
       FROM "Investment" i
       JOIN "User" u ON i."userId" = u.id
       WHERE u."referredBy" = $1`,
      [u.id]
    );

    let liveInvestmentReturns = 0;
    let liveInvestmentProfitShare = 0;
    const now = Date.now();

    if (invResult.rows.length > 0) {
      for (const inv of invResult.rows) {
        const start = new Date(inv.startTime).getTime();
        const elapsedSeconds = Math.max(0, (now - start) / 1000);
        const dailyEarnings = parseFloat(inv.amount) * 0.01;
        const currentReturn = elapsedSeconds * (dailyEarnings / 86400);
        liveInvestmentReturns += currentReturn;
      }
      if (u.isBroker) {
        // Profit share strictly on returns
        liveInvestmentProfitShare = liveInvestmentReturns * (commRate / 100);
      }
    }

    // Fetch referral candidates under this broker
    const referralRes = await db.query(
      'SELECT id, email, name, "createdAt" FROM "User" WHERE "referredBy" = $1 ORDER BY "createdAt" DESC',
      [u.id]
    );

    res.json({
      success: true,
      broker: {
        userId: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        isBroker: !!u.isBroker,
        brokerStatus: u.brokerStatus || 'None',
        brokerId,
        commissionRate: commRate,
        brokerEarnings: parseFloat(u.brokerEarnings || 0),
        liveInvestmentReturns: parseFloat(liveInvestmentReturns.toFixed(4)),
        liveInvestmentProfitShare: parseFloat(liveInvestmentProfitShare.toFixed(4)),
        activeInvestmentsCount: invResult.rows.length,
        totalSpent: parseFloat(u.totalBrokerSpent || 0),
        totalClaimed: parseFloat(u.totalBrokerClaimed || 0),
        referralCandidatesCount: referralRes.rows.length,
        referralCandidates: referralRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching broker status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/broker/claim-earnings - Transfer broker profits directly to user wallet
router.post('/claim-earnings', async (req, res) => {
  const client = await db.connect();
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT id, email, "isBroker", "brokerEarnings", "totalBrokerClaimed" FROM "User" WHERE LOWER(email) = $1 FOR UPDATE',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];
    const earnings = parseFloat(user.brokerEarnings || 0);

    if (earnings <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No live earnings available to transfer.' });
    }

    // 1. Credit wallet
    const walletRes = await client.query(
      'UPDATE "Wallet" SET balance = balance + $1 WHERE "userId" = $2 RETURNING balance',
      [earnings, user.id]
    );

    const newWalletBalance = walletRes.rows[0] ? parseFloat(walletRes.rows[0].balance) : 0;

    // 2. Reset brokerEarnings and increase totalBrokerClaimed in User
    await client.query(
      'UPDATE "User" SET "brokerEarnings" = 0.0, "totalBrokerClaimed" = "totalBrokerClaimed" + $1 WHERE id = $2',
      [earnings, user.id]
    );

    // 3. Insert transaction log
    await client.query(
      `INSERT INTO "Transaction" ("userId", "type", "asset", "amount", "fee", "gst", "details", "createdAt")
       VALUES ($1, $2, $3, $4, 0.00, 0.00, $5, CURRENT_TIMESTAMP)`,
      [
        user.id,
        'referral', // maps to positive credit transaction in UI
        'wallet',
        earnings,
        `Broker Partner Guaranteed Commission Claim (Transferred to Wallet)`
      ]
    );

    await client.query('COMMIT');

    // Notify socket
    const io = req.app.get('io');
    if (io) {
      io.emit('broker_claimed', {
        email: cleanEmail,
        claimedAmount: earnings,
        newWalletBalance
      });
    }

    res.json({
      success: true,
      message: `₹${earnings.toFixed(2)} successfully transferred to your main wallet! You can now use it or withdraw it anytime.`,
      claimedAmount: earnings,
      newWalletBalance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error claiming broker earnings:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to claim broker earnings.' });
  } finally {
    client.release();
  }
});

// GET /api/admin/broker-requests - List all broker applications and active brokers
router.get('/admin/requests', async (req, res) => {
  try {
    const requestsResult = await db.query(`
      SELECT 
        br.id,
        br."userId",
        br."customerId",
        br.name,
        br.phone,
        br.email,
        br."subscriptionFee",
        br."commissionRate",
        br.status,
        br."adminNotes",
        br."createdAt",
        br."updatedAt",
        u."isBroker",
        u."brokerCommissionRate",
        u."brokerEarnings",
        u."totalBrokerSpent",
        u."totalBrokerClaimed"
      FROM "BrokerRequest" br
      LEFT JOIN "User" u ON br."userId" = u.id
      ORDER BY br."createdAt" DESC
    `);

    // Also get all approved brokers even if requested earlier or manually assigned
    const brokersResult = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u."isBroker",
        u."brokerStatus",
        u."brokerCommissionRate",
        u."brokerEarnings",
        u."totalBrokerSpent",
        u."totalBrokerClaimed",
        w.balance as "walletBalance",
        (SELECT COUNT(*) FROM "User" ref WHERE ref."referredBy" = u.id) as "referralCandidatesCount"
      FROM "User" u
      LEFT JOIN "Wallet" w ON u.id = w."userId"
      WHERE u."isBroker" = true OR u."brokerStatus" = 'Approved'
      ORDER BY u.id DESC
    `);

    const activeBrokers = brokersResult.rows.map(b => ({
      ...b,
      brokerId: `CUST-B-${b.id}`
    }));

    // Also get cancelled broker subscriptions for admin audit record
    const cancelledBrokersResult = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u."isBroker",
        u."brokerStatus",
        u."brokerCommissionRate",
        u."totalBrokerSpent",
        u."totalBrokerClaimed",
        w.balance as "walletBalance"
      FROM "User" u
      LEFT JOIN "Wallet" w ON u.id = w."userId"
      WHERE u."brokerStatus" = 'Cancelled'
      ORDER BY u.id DESC
    `);

    res.json({
      success: true,
      requests: requestsResult.rows,
      activeBrokers,
      cancelledBrokers: cancelledBrokersResult.rows
    });
  } catch (error) {
    console.error('Error fetching admin broker requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker-request/accept - Accept a broker request and upgrade customer ID
router.post('/admin/accept', async (req, res) => {
  const client = await db.connect();
  try {
    const { requestId, commissionRate = 7.5, adminNotes = '' } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    await client.query('BEGIN');

    const reqResult = await client.query(
      'SELECT * FROM "BrokerRequest" WHERE id = $1 FOR UPDATE',
      [parseInt(requestId)]
    );

    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Broker request not found.' });
    }

    const bRequest = reqResult.rows[0];
    const rate = Math.min(10, Math.max(5, parseFloat(commissionRate) || 7.5)); // Between 5% and 10%
    const upgradedCustomerId = `CUST-B-${bRequest.userId}`;

    // 1. Update BrokerRequest
    await client.query(
      `UPDATE "BrokerRequest" 
       SET status = 'Approved', "commissionRate" = $1, "adminNotes" = $2, "customerId" = $3, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $4`,
      [rate, adminNotes || 'Approved by Admin', upgradedCustomerId, bRequest.id]
    );

    // 2. Update User to isBroker = true, brokerStatus = 'Approved', commission rate
    await client.query(
      `UPDATE "User"
       SET "isBroker" = true, "brokerStatus" = 'Approved', "brokerCommissionRate" = $1
       WHERE id = $2`,
      [rate, bRequest.userId]
    );

    await client.query('COMMIT');

    // Notify all connected clients via Socket
    const io = req.app.get('io');
    if (io) {
      io.emit('broker_status_updated', {
        userId: bRequest.userId,
        email: bRequest.email,
        isBroker: true,
        brokerStatus: 'Approved',
        brokerId: upgradedCustomerId,
        commissionRate: rate
      });
    }

    res.json({
      success: true,
      message: `Broker request approved! Customer ID updated to ${upgradedCustomerId} with ${rate}% guaranteed commission.`,
      upgradedCustomerId,
      commissionRate: rate
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting broker request:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to accept broker request.' });
  } finally {
    client.release();
  }
});

// POST /api/admin/broker-request/reject - Reject a broker request
router.post('/admin/reject', async (req, res) => {
  try {
    const { requestId, adminNotes = '' } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    const reqResult = await db.query(
      'SELECT * FROM "BrokerRequest" WHERE id = $1',
      [parseInt(requestId)]
    );

    if (reqResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Broker request not found.' });
    }

    const bRequest = reqResult.rows[0];

    await db.query(
      `UPDATE "BrokerRequest" 
       SET status = 'Rejected', "adminNotes" = $1, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [adminNotes || 'Rejected by Admin', bRequest.id]
    );

    await db.query(
      'UPDATE "User" SET "brokerStatus" = $1 WHERE id = $2',
      ['Rejected', bRequest.userId]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('broker_status_updated', {
        userId: bRequest.userId,
        email: bRequest.email,
        isBroker: false,
        brokerStatus: 'Rejected'
      });
    }

    res.json({ success: true, message: 'Broker request rejected.' });
  } catch (error) {
    console.error('Error rejecting broker request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker/clear-request - Clear/Delete a single broker request
router.post('/admin/clear-request', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Request ID is required.' });
    }

    const delRes = await db.query(
      'DELETE FROM "BrokerRequest" WHERE id = $1 RETURNING *',
      [parseInt(requestId)]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Broker request not found.' });
    }

    res.json({
      success: true,
      message: 'Broker request cleared successfully.',
      clearedId: parseInt(requestId)
    });
  } catch (error) {
    console.error('Error clearing broker request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker/clear-all-requests - Clear all resolved (or all) broker requests
router.post('/admin/clear-all-requests', async (req, res) => {
  try {
    const { status = 'resolved' } = req.body;
    let query = 'DELETE FROM "BrokerRequest"';
    let params = [];

    if (status === 'resolved') {
      query += ` WHERE status IN ('Approved', 'Rejected', 'Cancelled')`;
    }

    const delRes = await db.query(query + ' RETURNING id');

    res.json({
      success: true,
      message: `Successfully cleared ${delRes.rowCount || 0} broker request(s).`,
      count: delRes.rowCount || 0
    });
  } catch (error) {
    console.error('Error clearing all broker requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker/adjust-commission - Adjust commission % or distribute profit directly
router.post('/admin/adjust-commission', async (req, res) => {
  try {
    const { userId, commissionRate } = req.body;
    if (!userId || isNaN(commissionRate)) {
      return res.status(400).json({ success: false, error: 'User ID and valid commission rate required.' });
    }

    const rate = Math.min(10, Math.max(5, parseFloat(commissionRate)));

    await db.query(
      'UPDATE "User" SET "brokerCommissionRate" = $1 WHERE id = $2',
      [rate, parseInt(userId)]
    );

    await db.query(
      'UPDATE "BrokerRequest" SET "commissionRate" = $1 WHERE "userId" = $2',
      [rate, parseInt(userId)]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('broker_status_updated', {
        userId: parseInt(userId),
        commissionRate: rate
      });
    }

    res.json({ success: true, message: `Commission rate updated to ${rate}%`, commissionRate: rate });
  } catch (error) {
    console.error('Error adjusting commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker/distribute-profit - Admin directly adds profit to broker live earnings
router.post('/admin/distribute-profit', async (req, res) => {
  try {
    const { userId, profitAmount, note } = req.body;
    const amt = parseFloat(profitAmount);
    if (!userId || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'User ID and positive profit amount required.' });
    }

    const updateRes = await db.query(
      'UPDATE "User" SET "brokerEarnings" = "brokerEarnings" + $1 WHERE id = $2 RETURNING "brokerEarnings", email',
      [amt, parseInt(userId)]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = updateRes.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('broker_earning_update', {
        userId: parseInt(userId),
        email: user.email,
        addedProfit: amt,
        totalEarnings: parseFloat(user.brokerEarnings),
        note: note || 'Profit distributed by Admin'
      });
    }

    res.json({
      success: true,
      message: `Successfully distributed ₹${amt.toFixed(2)} to broker's live earnings.`,
      newBrokerEarnings: parseFloat(user.brokerEarnings)
    });
  } catch (error) {
    console.error('Error distributing profit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/broker/cancel-subscription - Admin revokes/cancels a broker subscription
router.post('/admin/cancel-subscription', async (req, res) => {
  const client = await db.connect();
  try {
    const { userId, reason = 'Administrative cancellation' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const uId = parseInt(userId);

    await client.query('BEGIN');

    // 1. Check user
    const userRes = await client.query(
      'SELECT id, email, name, "isBroker", "brokerStatus" FROM "User" WHERE id = $1 FOR UPDATE',
      [uId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];

    // 2. Revoke broker privileges in User table (reverts CUST-B- to CUST-)
    await client.query(
      `UPDATE "User"
       SET "isBroker" = false, 
           "brokerStatus" = 'Cancelled',
           "brokerEarnings" = 0.0
       WHERE id = $1`,
      [uId]
    );

    // 3. Update any approved or pending BrokerRequest records to 'Cancelled' and revert customerId back to CUST-
    await client.query(
      `UPDATE "BrokerRequest"
       SET status = 'Cancelled', 
           "customerId" = $1,
           "adminNotes" = $2, 
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $3 AND status IN ('Approved', 'Pending')`,
      [`CUST-${uId}`, reason || 'Subscription cancelled by Administrator', uId]
    );

    // 4. Create an audit transaction record
    await client.query(
      `INSERT INTO "Transaction" ("userId", "type", "asset", "amount", "fee", "gst", "details", "createdAt")
       VALUES ($1, $2, $3, 0.00, 0.00, 0.00, $4, CURRENT_TIMESTAMP)`,
      [
        uId,
        'BROKER_CANCEL',
        'BROKER_PRIVILEGE',
        `Institutional Broker Partnership subscription cancelled by Admin. Reason: ${reason || 'Administrative action'}`
      ]
    );

    await client.query('COMMIT');

    // 5. Broadcast real-time status update to client via Socket
    const io = req.app.get('io');
    const revertedCustomerId = `CUST-${uId}`;
    if (io) {
      io.emit('broker_status_updated', {
        userId: uId,
        email: user.email,
        isBroker: false,
        brokerStatus: 'Cancelled',
        brokerId: revertedCustomerId,
        reason
      });
    }

    console.log(`[BROKER CANCEL] User #${uId} (${user.email}) subscription revoked by Admin.`);

    res.json({
      success: true,
      message: `Broker subscription for ${user.email} (CUST-${uId}) has been successfully cancelled by Admin.`,
      userId: uId,
      email: user.email,
      isBroker: false,
      brokerStatus: 'Cancelled',
      revertedCustomerId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling broker subscription:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel broker subscription.' });
  } finally {
    client.release();
  }
});

// POST /api/broker/admin/reactivate - Re-activate a cancelled broker subscription
router.post('/admin/reactivate', async (req, res) => {
  const client = await db.connect();
  try {
    const { userId, commissionRate = 7.5 } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const uId = parseInt(userId);
    const rate = Math.min(10, Math.max(5, parseFloat(commissionRate) || 7.5));
    const upgradedCustomerId = `CUST-B-${uId}`;

    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT id, email, name FROM "User" WHERE id = $1 FOR UPDATE',
      [uId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];

    // 1. Update User to isBroker = true, brokerStatus = 'Approved', commissionRate
    await client.query(
      `UPDATE "User"
       SET "isBroker" = true, "brokerStatus" = 'Approved', "brokerCommissionRate" = $1
       WHERE id = $2`,
      [rate, uId]
    );

    // 2. Update BrokerRequest
    await client.query(
      `UPDATE "BrokerRequest"
       SET status = 'Approved', "customerId" = $1, "commissionRate" = $2, "adminNotes" = 'Re-activated by Admin', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "userId" = $3`,
      [upgradedCustomerId, rate, uId]
    );

    // 3. Create Audit transaction record
    await client.query(
      `INSERT INTO "Transaction" ("userId", "type", "asset", "amount", "fee", "gst", "details", "createdAt")
       VALUES ($1, $2, $3, 0.00, 0.00, 0.00, $4, CURRENT_TIMESTAMP)`,
      [
        uId,
        'BROKER_REACTIVATE',
        'BROKER_PRIVILEGE',
        `Institutional Broker Partnership re-activated by Admin. ID upgraded to ${upgradedCustomerId} with ${rate}% commission.`
      ]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('broker_status_updated', {
        userId: uId,
        email: user.email,
        isBroker: true,
        brokerStatus: 'Approved',
        brokerId: upgradedCustomerId,
        commissionRate: rate
      });
    }

    console.log(`[BROKER REACTIVATE] User #${uId} (${user.email}) re-activated by Admin as ${upgradedCustomerId}`);

    res.json({
      success: true,
      message: `Broker re-activated successfully! ID upgraded to ${upgradedCustomerId} with ${rate}% guaranteed commission.`,
      userId: uId,
      email: user.email,
      isBroker: true,
      brokerStatus: 'Approved',
      brokerId: upgradedCustomerId,
      commissionRate: rate
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reactivating broker:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reactivate broker.' });
  } finally {
    client.release();
  }
});

module.exports = router;
