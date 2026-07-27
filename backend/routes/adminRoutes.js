const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmailHelper, getFromEmail } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const requireSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'replace-with-your-secret');
    
    if (decoded.isExecutive) {
      const executive = await prisma.supportExecutive.findUnique({
        where: { id: decoded.id }
      });
      if (executive && (executive.role === 'SuperAdmin' || executive.role === 'Admin')) {
        req.executive = executive;
        return next();
      }
      return res.status(403).json({ success: false, error: 'Forbidden: SuperAdmin access required' });
    }
    // If regular user token, check if they have admin privileges (if applicable)
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  } catch (error) {
    console.error('SuperAdmin Auth Error:', error);
    res.status(401).json({ success: false, error: `Auth Error: ${error.message}` });
  }
};
router.post('/delete-user', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required for deletion' });
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database' });
    }

    // Delete all related records in a transaction to prevent orphan records
    await prisma.$transaction([
      prisma.$executeRawUnsafe('DELETE FROM trades WHERE user_email = $1', user.email),
      prisma.$executeRawUnsafe('DELETE FROM contest_trades WHERE user_email = $1', user.email),
      prisma.$executeRawUnsafe('DELETE FROM contest_participants WHERE email = $1', user.email),
      prisma.payment.deleteMany({ where: { userId: user.id } }),
      prisma.transaction.deleteMany({ where: { userId: user.id } }),
      prisma.position.deleteMany({ where: { userId: user.id } }),
      prisma.trade.deleteMany({ where: { userId: user.id } }),
      prisma.wallet.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } })
    ]);

    res.json({ success: true, message: 'User permanently deleted from database' });
  } catch (error) {
    console.error('Error deleting user from database:', error);
    res.status(500).json({ success: false, message: 'Database deletion failed', error: error.message });
  }
});

router.post('/wallet/adjust', async (req, res) => {
  const { userId, amount, action } = req.body;
  
  if (!userId || !amount || isNaN(amount) || amount <= 0 || !['credit', 'deduct'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid parameters' });
  }

  try {
    const val = parseFloat(amount);
    const numericUserId = typeof userId === 'string' && userId.startsWith('CUST-') 
      ? parseInt(userId.replace('CUST-', '')) 
      : parseInt(userId);

    if (isNaN(numericUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    
    await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId: numericUserId } });
      
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId: numericUserId, balance: 0 } });
      }

      if (action === 'deduct' && wallet.balance < val) {
        throw new Error('Insufficient wallet balance for deduction');
      }

      const updatedBalance = action === 'credit' 
        ? wallet.balance + val 
        : wallet.balance - val;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: updatedBalance }
      });

      await tx.transaction.create({
        data: {
          userId: numericUserId,
          type: action === 'credit' ? 'deposit' : 'withdrawal',
          asset: 'wallet',
          amount: val,
          details: `Admin Ledger Adjustment (${action})`
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    res.json({ success: true, message: `Successfully ${action}ed wallet balance` });
  } catch (error) {
    console.error('Error adjusting wallet:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to adjust wallet balance' });
  }
});

router.post('/users/unlock', async (req, res) => {
  const { userId } = req.body;
  try {
    const numericUserId = typeof userId === 'string' && userId.startsWith('CUST-') 
      ? parseInt(userId.replace('CUST-', '')) 
      : parseInt(userId);

    const updatedUser = await prisma.user.update({
      where: { id: numericUserId },
      data: { isUnlocked: true }
    });
    res.json({ success: true, user: updatedUser, message: 'Account unlocked successfully' });
  } catch (error) {
    console.error('Error unlocking account:', error);
    res.status(500).json({ success: false, message: 'Failed to unlock account', error: error.message });
  }
});

router.post('/kyc/update', async (req, res) => {
  const { userId, status } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { kycStatus: status }
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update KYC status', error: error.message });
  }
});

router.post('/kyc/delete', async (req, res) => {
  const { userId } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        kycDocument: null,
        kycDocName: null,
        kycDocType: null,
        kycUploadedAt: null,
        kycStatus: 'Pending'
      }
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete KYC document', error: error.message });
  }
});

router.post('/kyc/replace', async (req, res) => {
  const { userId, document, fileName, fileType } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        kycDocument: document,
        kycDocName: fileName,
        kycDocType: fileType,
        kycUploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        kycStatus: 'Submitted'
      }
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to replace KYC document', error: error.message });
  }
});

router.get('/users/sync', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          not: 'sandeepkumar.pikili@vrpigroup.co.in'
        }
      },
      include: {
        wallet: true,
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const clients = users.map(user => {
      const txs = user.transactions.map(t => ({
        id: 'TX-' + t.id,
        type: t.type?.toLowerCase() === 'deposit' ? 'deposit' : 
              t.type?.toLowerCase() === 'referral' ? 'referral' : 
              t.type?.toLowerCase() === 'refund' ? 'refund' : 'withdrawal',
        asset: t.asset || 'wallet',
        amount: t.amount,
        status: 'Completed',
        date: new Date(t.createdAt).toISOString().slice(0, 16).replace('T', ' ')
      }));

      return {
        id: 'CUST-' + user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
        phone: user.phone || '',
        walletBalance: user.wallet?.balance || 0,
        holdings: { gold: 0, silver: 0, platinum: 0, iron: 0 },
        kycStatus: user.kycStatus || 'Pending',
        kycDocument: user.kycDocument ? {
          type: user.kycDocType,
          fileName: user.kycDocName,
          fileSize: 'Uploaded',
          uploadedAt: user.kycUploadedAt,
          fileData: user.kycDocument
        } : null,
        transactions: txs,
        referralCount: user.referralCount || 0,
        isUnlocked: user.isUnlocked || false
      };
    });

    res.json({ success: true, clients });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/admin/withdrawals - Fetch all withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await prisma.payment.findMany({
      where: {
        paymentMethod: {
          contains: 'withdrawal'
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            wallet: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, withdrawals });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawals', error: error.message });
  }
});

// POST /api/admin/withdrawal/approve - Approve a pending withdrawal request
router.post('/withdrawal/approve', async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'Payment ID is required' });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (payment.status !== 'processing') {
      return res.status(400).json({ success: false, message: `Withdrawal request already processed. Current status: ${payment.status}` });
    }

    // Update payment status to successful
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'successful' }
    });

    res.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ success: false, message: 'Failed to approve withdrawal', error: error.message });
  }
});

// POST /api/admin/withdrawal/reject - Reject a pending withdrawal request (refunds user balance)
router.post('/withdrawal/reject', async (req, res) => {
  const { paymentId, rejectReason } = req.body;

  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'Payment ID is required' });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (payment.status !== 'processing') {
      return res.status(400).json({ success: false, message: `Withdrawal request already processed. Current status: ${payment.status}` });
    }

    // Run transaction to reject payout, refund wallet, and log refund ledger
    const [updatedPayment, updatedWallet, refundTx] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'failed' }
      }),
      prisma.wallet.update({
        where: { userId: payment.userId },
        data: { balance: { increment: payment.amount } }
      }),
      prisma.transaction.create({
        data: {
          userId: payment.userId,
          type: 'refund',
          asset: 'wallet',
          amount: payment.amount,
          details: `Withdrawal Rejected: Refunded ₹${payment.amount.toFixed(2)}${rejectReason ? ` (${rejectReason})` : ''}`
        }
      })
    ]);

    res.json({ success: true, payment: updatedPayment, refundTx });
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal', error: error.message });
  }
});

// POST /api/admin/withdrawals/clear - Clear (delete) withdrawal requests from database
router.post('/withdrawals/clear', async (req, res) => {
  const { paymentIds } = req.body;

  if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
    return res.status(400).json({ success: false, message: 'paymentIds array is required' });
  }

  try {
    await prisma.payment.deleteMany({
      where: {
        id: {
          in: paymentIds
        }
      }
    });

    res.json({ success: true, message: `Successfully cleared ${paymentIds.length} withdrawal request(s)` });
  } catch (error) {
    console.error('Error clearing withdrawals:', error);
    res.status(500).json({ success: false, message: 'Failed to clear withdrawals', error: error.message });
  }
});

// GET /api/admin/platform-profit - Total fees + GST collected from all client trades
router.get('/platform-profit', async (req, res) => {
  try {
    // Sum fee and gst across all closed trades
    const result = await prisma.trade.aggregate({
      where: { status: 'closed' },
      _sum: { fee: true, gst: true }
    });

    const totalFees = result._sum.fee || 0;
    const totalGst = result._sum.gst || 0;
    const totalProfit = totalFees + totalGst;

    // Also get the count of closed trades (for context)
    const tradeCount = await prisma.trade.count({ where: { status: 'closed' } });

    res.json({ success: true, totalFees, totalGst, totalProfit, tradeCount });
  } catch (error) {
    console.error('Error fetching platform profit:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform profit', error: error.message });
  }
});

// Client-facing: Get withdrawal request status for a specific user
router.get('/my-withdrawals', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const withdrawals = await prisma.payment.findMany({
      where: {
        userId: user.id,
        paymentMethod: { in: ['upi_withdrawal', 'bank_withdrawal', 'upi_withdrawal_sim', 'bank_withdrawal_sim'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, withdrawals: withdrawals.map(w => ({
      id: w.id,
      orderId: w.orderId,
      amount: w.amount,
      method: w.paymentMethod,
      status: w.status, // 'processing' | 'successful' | 'failed'
      createdAt: w.createdAt
    }))});
  } catch (error) {
    console.error('Error fetching user withdrawals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/support-executives - Fetch all support executives
router.get('/support-executives', async (req, res) => {
  try {
    const executives = await prisma.supportExecutive.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, executives });
  } catch (error) {
    console.error('Error fetching support executives:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch support executives', error: error.message });
  }
});

// POST /api/admin/support-executives - Create a support executive
router.post('/support-executives', async (req, res) => {
  const { name, phone, email, role, salary, status, shift, languages, rating, experienceYrs } = req.body;
  if (!name || !email || !role || salary === undefined) {
    return res.status(400).json({ success: false, message: 'Name, email, role, and salary are required' });
  }

  try {
    // Generate temporary password (8 characters)
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const executive = await prisma.supportExecutive.create({
      data: {
        name,
        phone: phone || null,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        attendance: '[]',
        role,
        salary: parseFloat(salary),
        status: status || 'Active',
        shift: shift || 'Day',
        languages: languages || 'English, Hindi',
        rating: rating !== undefined ? parseFloat(rating) : 5.0,
        experienceYrs: experienceYrs !== undefined ? parseInt(experienceYrs) : 0,
        settings: JSON.stringify({ isTempPassword: true })
      }
    });

    // Send onboarding email notification to the executive
    if (email) {
      try {
        await sendEmailHelper({
          from: getFromEmail(),
          to: email,
          subject: 'Welcome to Investhour Support Team - Onboarding Details',
          text: `Hello ${name},\n\nYou have been registered as a Support Executive at Investhour.\n\nHere are your login credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and update your password.\n\nBest regards,\nInvesthour Admin Team`,
          html: `<p>Hello <strong>${name}</strong>,</p>
                 <p>You have been registered as a Support Executive at Investhour.</p>
                 <p><strong>Login Credentials:</strong><br/>
                 Email: <code>${email}</code><br/>
                 Temporary Password: <code>${tempPassword}</code></p>
                 <p>Please log in and update your password.</p>
                 <p>Best regards,<br/>Investhour Admin Team</p>`
        });
        console.log(`[Onboarding] Onboarding credentials email dispatched to ${email}`);
      } catch (mailErr) {
        console.error('[Onboarding] Failed to dispatch onboarding email:', mailErr.message);
      }
    }

    res.json({ success: true, executive, tempPassword });
  } catch (error) {
    console.error('Error creating support executive:', error);
    res.status(500).json({ success: false, message: 'Failed to create support executive', error: error.message });
  }
});

// PUT /api/admin/support-executives/:id - Update support executive
router.put('/support-executives/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, role, salary, status, shift, languages, rating, experienceYrs, attendance } = req.body;

  try {
    const existing = await prisma.supportExecutive.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Support executive not found' });
    }

    const executive = await prisma.supportExecutive.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email.trim().toLowerCase() : existing.email,
        role: role !== undefined ? role : existing.role,
        salary: salary !== undefined ? parseFloat(salary) : existing.salary,
        status: status !== undefined ? status : existing.status,
        shift: shift !== undefined ? shift : existing.shift,
        languages: languages !== undefined ? languages : existing.languages,
        rating: rating !== undefined ? parseFloat(rating) : existing.rating,
        experienceYrs: experienceYrs !== undefined ? parseInt(experienceYrs) : existing.experienceYrs,
        attendance: attendance !== undefined ? attendance : existing.attendance
      }
    });
    res.json({ success: true, executive });
  } catch (error) {
    console.error('Error updating support executive:', error);
    res.status(500).json({ success: false, message: 'Failed to update support executive', error: error.message });
  }
});

// DELETE /api/admin/support-executives/:id - Delete support executive
router.delete('/support-executives/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.supportExecutive.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true, message: 'Support executive deleted successfully' });
  } catch (error) {
    console.error('Error deleting support executive:', error);
    res.status(500).json({ success: false, message: 'Failed to delete support executive', error: error.message });
  }
});

// GET /api/admin/support-executives/:id/stats - Fetch stats for portfolio view
router.get('/support-executives/:id/stats', async (req, res) => {
  const { id } = req.params;
  try {
    const execId = parseInt(id);
    const exec = await prisma.supportExecutive.findUnique({
      where: { id: execId }
    });
    if (!exec) {
      return res.status(404).json({ success: false, message: 'Support executive not found' });
    }

    const logs = JSON.parse(exec.attendance || '[]');
    
    // Calculate Attendance Sessions ratios (Today & This Month)
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    
    let attendanceTodayLate = 0;
    let attendanceTodayOnTime = 0;
    let attendanceMonthLate = 0;
    let attendanceMonthOnTime = 0;
    
    logs.forEach(log => {
      if (log.date === todayStr) {
        if (log.status === 'Late') attendanceTodayLate++;
        else attendanceTodayOnTime++;
      }
      if (log.date.startsWith(currentMonthStr)) {
        if (log.status === 'Late') attendanceMonthLate++;
        else attendanceMonthOnTime++;
      }
    });

    // Resolved Chats counts
    const chatsClosed = await prisma.supportMessage.count({
      where: { execId: execId }
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const chatsClosedToday = await prisma.supportMessage.count({
      where: {
        execId: execId,
        createdAt: { gte: startOfToday, lte: endOfToday }
      }
    });

    // Deposits approved today
    const depositsToday = await prisma.manualDeposit.findMany({
      where: {
        execId: execId,
        status: 'Approved',
        updatedAt: { gte: startOfToday, lte: endOfToday }
      }
    });
    const depositsTodayCount = depositsToday.length;
    const depositsTodaySum = depositsToday.reduce((sum, d) => sum + d.amount, 0);

    // Deposits approved this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const depositsMonth = await prisma.manualDeposit.findMany({
      where: {
        execId: execId,
        status: 'Approved',
        updatedAt: { gte: startOfMonth }
      }
    });
    const depositsMonthSum = depositsMonth.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      success: true,
      stats: {
        chatsClosed,
        chatsClosedToday,
        attendanceTodayLate,
        attendanceTodayOnTime,
        attendanceMonthLate,
        attendanceMonthOnTime,
        depositsTodayCount,
        depositsTodaySum,
        depositsMonthSum
      }
    });
  } catch (error) {
    console.error('Error fetching support executive stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
});

// Get Forwarded Deposit Requests and History
router.get('/deposits/forwarded', async (req, res) => {
  try {
    const deposits = await prisma.manualDeposit.findMany({
      where: { status: 'ForwardedToSuperAdmin' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        reviewedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const history = await prisma.manualDeposit.findMany({
      where: { status: { in: ['Approved', 'Rejected'] } },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        reviewedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    res.json({ success: true, deposits, history });
  } catch (err) {
    console.error("Error fetching forwarded deposits:", err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Process Forwarded Deposit Request
router.post('/deposits/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action' });
  }

  try {
    const deposit = await prisma.manualDeposit.findUnique({ where: { id: parseInt(id) } });
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    if (deposit.status !== 'ForwardedToSuperAdmin') return res.status(400).json({ success: false, error: `Deposit is ${deposit.status}, cannot process` });

    if (action === 'approve') {
      await prisma.$transaction(async (tx) => {
        await tx.manualDeposit.update({
          where: { id: deposit.id },
          data: { status: 'Approved' }
        });

        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
        const isUnlockFee = deposit.notes === 'unlock_fee';

        if (isUnlockFee) {
          if (user) {
            await tx.user.update({
              where: { id: deposit.userId },
              data: { isUnlocked: true }
            });
          }
          await tx.transaction.create({
            data: {
              userId: deposit.userId,
              type: 'unlock_fee',
              asset: 'wallet',
              amount: deposit.amount,
              details: `Account unlocked via manual fee payment (UTR: ${deposit.utrNumber}) - SuperAdmin Approved`
            }
          });
        } else {
          const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
          if (wallet) {
            await tx.wallet.update({
              where: { userId: deposit.userId },
              data: { balance: { increment: deposit.amount } }
            });
          } else {
            await tx.wallet.create({
              data: { userId: deposit.userId, balance: deposit.amount }
            });
          }

          if (user && !user.isUnlocked) {
            await tx.user.update({
              where: { id: deposit.userId },
              data: { isUnlocked: true }
            });
          }

          await tx.transaction.create({
            data: {
              userId: deposit.userId,
              type: 'deposit',
              asset: 'wallet',
              amount: deposit.amount,
              details: `Manual Deposit Approved (UTR: ${deposit.utrNumber}) - SuperAdmin Approved`
            }
          });
        }
      }, { maxWait: 15000, timeout: 30000 });
      return res.json({ success: true, message: 'Deposit fully approved and credited' });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.manualDeposit.update({
          where: { id: deposit.id },
          data: { status: 'Rejected' }
        });
        
        let detailsString = `Manual Deposit Rejected (UTR: ${deposit.utrNumber || 'N/A'}) - SuperAdmin Rejected`;
        if (reason) detailsString += ` - Reason: ${reason}`;

        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'refund',
            asset: 'wallet',
            amount: deposit.amount,
            details: detailsString
          }
        });
      }, { maxWait: 15000, timeout: 30000 });
      return res.json({ success: true, message: 'Deposit rejected successfully' });
    }
  } catch (err) {
    console.error("Error processing forwarded deposit:", err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
});

module.exports = router;


