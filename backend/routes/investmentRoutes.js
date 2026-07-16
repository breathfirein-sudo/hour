const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all investments for a user
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const investments = await prisma.investment.findMany({
      where: { userId: userId },
      orderBy: { startTime: 'desc' }
    });

    res.json({ success: true, investments });
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

    if (isNaN(uid) || isNaN(amt) || amt < 100) {
      return res.status(400).json({ success: false, message: 'Minimum investment amount is ₹100' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: uid } });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    if (wallet.balance < amt) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in wallet' });
    }

    // Use transaction
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

      return { wallet: updatedWallet, investment: newInvestment };
    });

    res.json({ success: true, investment: result.investment, wallet: result.wallet });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Withdraw an investment
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

    const now = new Date().getTime();
    const start = new Date(investment.startTime).getTime();
    const elapsedSeconds = Math.max(0, (now - start) / 1000);
    
    // Logic: 1% of investment per day (1% divided by 86400 seconds)
    const dailyEarnings = investment.amount * (1 / 100);
    const earningsPerSecond = dailyEarnings / 86400;
    const totalEarnings = elapsedSeconds * earningsPerSecond;

    const returnAmount = investment.amount + totalEarnings;

    const result = await prisma.$transaction(async (tx) => {
      await tx.investment.delete({ where: { id: id } });

      const updatedWallet = await tx.wallet.update({
        where: { userId: investment.userId },
        data: { balance: { increment: returnAmount } }
      });

      return updatedWallet;
    });

    res.json({ success: true, wallet: result });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
