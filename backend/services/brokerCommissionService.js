const db = require('../db');

/**
 * Evaluates whether the user has a referrer who is an approved broker,
 * and if so, credits the superadmin-allotted commission to that broker.
 *
 * @param {Object} params
 * @param {number} params.userId - The ID of the user performing the spend/trade
 * @param {string} [params.userEmail] - Email of the user
 * @param {number} params.spentAmount - Amount spent (e.g. ₹10 trade stake, investment amount, metal trade amount)
 * @param {string} params.actionType - 'TRADE', 'INVESTMENT', 'METAL_BUY', etc.
 * @param {string} [params.description] - Description for transaction log
 * @param {Object} [params.client] - Optional PostgreSQL client if inside an existing transaction
 * @param {Object} [params.io] - Optional Socket.IO instance for real-time emission
 * @returns {Promise<{ credited: boolean, brokerId?: number, commEarned?: number, commRate?: number }>}
 */
async function processBrokerCommission({
  userId,
  userEmail,
  spentAmount,
  actionType = 'TRADE',
  description = '',
  client = null,
  io = null
}) {
  const queryExecutor = client || db;
  try {
    const numUserId = parseInt(userId);
    const amt = parseFloat(spentAmount);
    if (!numUserId || isNaN(amt) || amt <= 0) {
      return { credited: false };
    }

    // 1. Look up user's referredBy
    const userRes = await queryExecutor.query(
      'SELECT id, email, "referredBy" FROM "User" WHERE id = $1',
      [numUserId]
    );
    if (userRes.rows.length === 0) {
      return { credited: false };
    }

    const spendingUser = userRes.rows[0];
    const referrerId = spendingUser.referredBy;

    // If no referrer or referred by self, no commission
    if (!referrerId || referrerId === numUserId) {
      return { credited: false };
    }

    // 2. Fetch referrer to check if they are an approved Broker
    const brokerRes = await queryExecutor.query(
      'SELECT id, email, name, "isBroker", "brokerStatus", "brokerCommissionRate", "brokerEarnings", "totalBrokerSpent" FROM "User" WHERE id = $1',
      [referrerId]
    );

    if (brokerRes.rows.length === 0) {
      return { credited: false };
    }

    const broker = brokerRes.rows[0];
    const isApprovedBroker = !!broker.isBroker && (broker.brokerStatus === 'Approved' || broker.brokerStatus === 'Active');

    // ONLY approved brokers get commission
    if (!isApprovedBroker) {
      return { credited: false };
    }

    // 3. Calculate SuperAdmin allotted commission
    const commRate = Math.min(10, Math.max(5, parseFloat(broker.brokerCommissionRate || 7.5)));
    const commEarned = parseFloat((amt * (commRate / 100)).toFixed(2));

    if (commEarned <= 0) {
      return { credited: false };
    }

    // 4. Update Broker's earnings and spent volume in DB
    await queryExecutor.query(
      `UPDATE "User"
       SET "brokerEarnings" = "brokerEarnings" + $1,
           "totalBrokerSpent" = "totalBrokerSpent" + $2
       WHERE id = $3`,
      [commEarned, amt, broker.id]
    );

    // 5. Create audit Transaction entry for the Broker
    const txDetails = `Broker Commission (₹${commEarned.toFixed(2)} @ ${commRate}%): Referral candidate ${spendingUser.email || userEmail || `User #${numUserId}`} spent ₹${amt.toFixed(2)} on ${description || actionType}`;
    await queryExecutor.query(
      `INSERT INTO "Transaction" ("userId", "type", "asset", "amount", "fee", "gst", "details", "createdAt")
       VALUES ($1, 'BROKER_COMMISSION', 'COMMISSION', $2, 0.00, 0.00, $3, CURRENT_TIMESTAMP)`,
      [broker.id, commEarned, txDetails]
    );

    // 6. Real-time notification via Socket.IO
    if (io) {
      io.emit('broker_earning_update', {
        userId: broker.id,
        email: broker.email,
        addedProfit: commEarned,
        totalEarnings: parseFloat(broker.brokerEarnings || 0) + commEarned,
        totalSpent: parseFloat(broker.totalBrokerSpent || 0) + amt,
        referralCandidate: spendingUser.email || userEmail || `User #${numUserId}`,
        actionType,
        spentAmount: amt,
        commissionRate: commRate,
        note: `Guaranteed ${commRate}% commission credited from referral spend`
      });
    }

    console.log(
      `[BROKER COMMISSION] Broker #${broker.id} (${broker.email}) credited ₹${commEarned} (${commRate}%) from referral candidate #${numUserId} (${spendingUser.email}) spending ₹${amt} on ${actionType}`
    );

    return {
      credited: true,
      brokerId: broker.id,
      commEarned,
      commRate
    };
  } catch (error) {
    console.error('[BROKER COMMISSION ERROR]:', error);
    return { credited: false, error: error.message };
  }
}

module.exports = {
  processBrokerCommission
};

