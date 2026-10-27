const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const db = require('../db');
const { processBrokerCommission } = require('../services/brokerCommissionService');

const prisma = new PrismaClient();

const LOCK_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Helper: Process automatic withdrawals for investments that completed 7 days lock period
async function processAutoWithdrawals(targetUserId = null) {
  try {
    const now = Date.now();
    const cutoffDate = new Date(now - LOCK_PERIOD_MS);

    const whereCondition = {
      startTime: { lte: cutoffDate }
    };
    if (targetUserId) {
      whereCondition.userId = targetUserId;
    }

    const expiredInvestments = await prisma.investment.findMany({
      where: whereCondition
    });

    if (!expiredInvestments || expiredInvestments.length === 0) {
      return 0;
    }

    let processedCount = 0;
    for (const inv of expiredInvestments) {
      const start = new Date(inv.startTime).getTime();
      const elapsedSeconds = Math.max(0, (now - start) / 1000);
      
      // Logic: 1% per day (1% / 86400 seconds)
      const dailyEarnings = inv.amount * 0.01;
      const earningsPerSecond = dailyEarnings / 86400;
      const totalEarnings = elapsedSeconds * earningsPerSecond;
      const returnAmount = inv.amount + totalEarnings;

      await prisma.$transaction(async (tx) => {
        // 1. Delete investment
        await tx.investment.delete({ where: { id: inv.id } });

        // 2. Update wallet balance with regular return
        await tx.wallet.update({
          where: { userId: inv.userId },
          data: { balance: { increment: returnAmount } }
        });

        // 3. Create transaction audit log for regular investment return
        await tx.transaction.create({
          data: {
            userId: inv.userId,
            type: 'INVESTMENT_AUTO_WITHDRAW',
            asset: 'INVESTMENT',
            amount: returnAmount,
            details: `Automatic withdrawal of ₹${returnAmount.toFixed(2)} (Principal: ₹${inv.amount.toFixed(2)} + 1% Returns: ₹${totalEarnings.toFixed(2)}) after 7-day lock period`
          }
        });

        // 4. If the investor was referred by an approved Broker, credit Broker's guaranteed profit share strictly on returns
        const investorUser = await tx.user.findUnique({
          where: { id: inv.userId },
          select: { id: true, email: true, referredBy: true }
        });

        if (investorUser && investorUser.referredBy && totalEarnings > 0) {
          const broker = await tx.user.findUnique({
            where: { id: investorUser.referredBy },
            select: { id: true, email: true, isBroker: true, brokerStatus: true, brokerCommissionRate: true }
          });

          if (broker && broker.isBroker && (broker.brokerStatus === 'Approved' || broker.brokerStatus === 'Active')) {
            const commRate = parseFloat(broker.brokerCommissionRate || 7.5);
            const brokerShare = parseFloat((totalEarnings * (commRate / 100)).toFixed(4));
            if (brokerShare > 0) {
              await tx.user.update({
                where: { id: broker.id },
                data: {
                  brokerEarnings: { increment: brokerShare },
                  totalBrokerSpent: { increment: inv.amount }
                }
              });

              await tx.transaction.create({
                data: {
                  userId: broker.id,
                  type: 'BROKER_COMMISSION',
                  asset: 'INVESTMENT_RETURNS',
                  amount: brokerShare,
                  details: `Broker Share (${commRate}% on returns of ₹${totalEarnings.toFixed(2)}): Earned from referral user ${investorUser.email}'s investment #${inv.id} (₹${inv.amount.toFixed(2)})`
                }
              });

              console.log(`[BROKER PROFIT SHARE] Credited ₹${brokerShare} (${commRate}%) to Broker #${broker.id} from user #${inv.userId}'s completed investment returns`);
            }
          }
        }
      });

      processedCount++;
      console.log(`[INVESTMENT AUTO-WITHDRAW] Investment #${inv.id} for user #${inv.userId} processed (Return: ₹${returnAmount.toFixed(2)})`);
    }

    return processedCount;
  } catch (error) {
    console.error('Error in processAutoWithdrawals:', error);
    return 0;
  }
}

// Background task: Auto-withdraw expired investments every 10 seconds
setInterval(async () => {
  await processAutoWithdrawals();
}, 10000);

// Get all investments for a user (and auto-withdraw any completed investments)
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Process auto-withdrawals for this user first
    await processAutoWithdrawals(userId);

    const investments = await prisma.investment.findMany({
      where: { userId: userId },
      orderBy: { startTime: 'desc' }
    });

    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId }
    });

    res.json({ success: true, investments, wallet });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new investment
router.post('/', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const uid = parseInt(userId);
    const amt = parseFloat(amount);

    if (isNaN(uid) || isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid investment amount greater than 0' });
    }

    // Process auto-withdrawals for this user first
    await processAutoWithdrawals(uid);

    // Check Wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: uid } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < amt) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in wallet' });
    }

    // Unlimited investment: No upper limit, weekly limit, or monthly limit

    // Use transaction to execute investment creation
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: uid },
        data: { balance: { decrement: amt } }
      });

      const newInvestment = await tx.investment.create({
        data: {
          userId: uid,
          amount: amt
        }
      });

      await tx.transaction.create({
        data: {
          userId: uid,
          type: 'INVESTMENT',
          asset: 'INVESTMENT',
          amount: amt,
          details: `Investment of ₹${amt.toLocaleString('en-IN')} created (7-day lock period)`
        }
      });

      return { wallet: updatedWallet, investment: newInvestment };
    });

    // Credit Broker commission if user was referred by an approved broker
    const io = req.app ? req.app.get('io') : null;
    await processBrokerCommission({
      userId: uid,
      spentAmount: amt,
      actionType: 'INVESTMENT',
      description: `Investment placement ₹${amt}`,
      client: db,
      io
    });

    res.json({ success: true, investment: result.investment, wallet: result.wallet });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manual withdrawal route
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid investment ID' });
    }

    const investment = await prisma.investment.findUnique({ where: { id: id } });
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    const now = Date.now();
    const start = new Date(investment.startTime).getTime();
    
    // Enforce 7-day lock period
    if (now - start < LOCK_PERIOD_MS) {
      const remainingTime = LOCK_PERIOD_MS - (now - start);
      const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
      return res.status(400).json({ 
        success: false, 
        message: `Investment is locked for 7 days. Remaining time: ${remainingDays} day${remainingDays > 1 ? 's' : ''}.` 
      });
    }

    // If unlocked, process auto-withdrawal
    await processAutoWithdrawals(investment.userId);

    const wallet = await prisma.wallet.findUnique({ where: { userId: investment.userId } });
    res.json({ success: true, wallet });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
