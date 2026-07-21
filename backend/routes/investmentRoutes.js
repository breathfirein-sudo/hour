const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

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

        // 2. Update wallet balance
        await tx.wallet.update({
          where: { userId: inv.userId },
          data: { balance: { increment: returnAmount } }
        });

        // 3. Create transaction audit log
        await tx.transaction.create({
          data: {
            userId: inv.userId,
            type: 'INVESTMENT_AUTO_WITHDRAW',
            asset: 'INVESTMENT',
            amount: returnAmount,
            details: `Automatic withdrawal of ₹${returnAmount.toFixed(2)} after 7-day lock period`
          }
        });
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

    if (isNaN(uid) || isNaN(amt)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    // Rule 1: Investment amount must be exactly 1000
    if (amt !== 1000) {
      return res.status(400).json({ success: false, message: 'Investment amount must be exactly ₹1,000.' });
    }

    const now = Date.now();
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);

    // First process auto-withdrawals for this user
    await processAutoWithdrawals(uid);

    // Check Wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId: uid } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < amt) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in wallet' });
    }

    // Rule 2: Weekly investment limit = ₹1,000
    // Check total invested in past 7 days
    const activeWeeklyInvs = await prisma.investment.findMany({
      where: { userId: uid, startTime: { gte: sevenDaysAgo } }
    });
    const activeWeeklySum = activeWeeklyInvs.reduce((sum, inv) => sum + inv.amount, 0);

    const weeklyTx = await prisma.transaction.aggregate({
      where: { userId: uid, type: 'INVESTMENT', createdAt: { gte: sevenDaysAgo } },
      _sum: { amount: true }
    });
    const txWeeklySum = weeklyTx._sum.amount || 0;

    const totalWeeklyInvested = Math.max(activeWeeklySum, txWeeklySum);

    if (totalWeeklyInvested + amt > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Weekly investment limit reached. You can only invest ₹1,000 per week.'
      });
    }

    // Rule 3: Monthly investment limit = ₹4,000
    // Check total invested in past 30 days
    const activeMonthlyInvs = await prisma.investment.findMany({
      where: { userId: uid, startTime: { gte: thirtyDaysAgo } }
    });
    const activeMonthlySum = activeMonthlyInvs.reduce((sum, inv) => sum + inv.amount, 0);

    const monthlyTx = await prisma.transaction.aggregate({
      where: { userId: uid, type: 'INVESTMENT', createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true }
    });
    const txMonthlySum = monthlyTx._sum.amount || 0;

    const totalMonthlyInvested = Math.max(activeMonthlySum, txMonthlySum);

    if (totalMonthlyInvested + amt > 4000) {
      return res.status(400).json({
        success: false,
        message: 'Monthly investment limit reached. You can only invest up to ₹4,000 per month.'
      });
    }

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
          details: 'Investment of ₹1,000 created (7-day lock period)'
        }
      });

      return { wallet: updatedWallet, investment: newInvestment };
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
