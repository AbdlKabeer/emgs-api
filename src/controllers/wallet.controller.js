// controllers/wallet.controller.js
const Wallet = require('../models/wallet.model');
const Transaction = require('../models/transaction.model');
const Withdrawal = require('../models/withdrawal.model');
const User = require('../models/user.model');
const Payment = require('../models/payment.model');
const Course = require('../models/course.model');
const { successResponse, badRequestResponse, internalServerErrorResponse , paginationResponse} = require('../utils/custom_response/responses');

// Get wallet balance and transactions
exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId });
      await wallet.save();
    }
    
    // Get transactions
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate({
        path: 'metadata.courseId',
        select: 'title'
      });
    
    return successResponse({
      wallet: {
        balance: wallet.balance,
        earned: wallet.earned,
        withdrawn: wallet.withdrawn,
        currency: wallet.currency
      },
      transactions: transactions.map(t => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        reference: t.reference,
        date: t.createdAt,
        courseTitle: t.metadata.courseId ? t.metadata.courseId.title : null
      }))
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Initiate withdrawal request
exports.initiateWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankName, accountNumber, accountName } = req.body;

    
    // Check if amount is valid
    if (isNaN(amount) || amount <= 0) {
      return badRequestResponse('Invalid amount', 'INVALID_AMOUNT', 400, res);
    }
    
    // Find wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return badRequestResponse('Wallet not found', 'NOT_FOUND', 404, res);
    }

    // add 1000 to the user account
    wallet.balance = 1000

    await wallet.save()
    
    // Check if there are sufficient funds
    if (wallet.balance < amount) {
      return badRequestResponse('Insufficient funds', 'INSUFFICIENT_FUNDS', 400, res);
    }
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      walletId: wallet._id,
      amount,
      type: 'withdrawal',
      status: 'pending',
      metadata: {
        bankName,
        accountNumber,
        accountName
      },
      description: 'Withdrawal request'
    });
    await transaction.save();
    
    // Create withdrawal record
    const withdrawal = new Withdrawal({
      userId,
      amount,
      walletId: wallet._id,
      transactionId: transaction._id,
      bankName,
      accountNumber,
      accountName,
      reference: transaction.reference
    });
    await withdrawal.save();
    
    // Update transaction with withdrawal ID
    transaction.metadata.withdrawalId = withdrawal._id;
    await transaction.save();
    
    // Update wallet balance (pending status, not deducted yet)
    // Actual deduction happens when admin approves withdrawal
    
    return successResponse({
      withdrawalId: withdrawal._id,
      reference: withdrawal.reference,
      status: withdrawal.status
    }, res, 200, 'Withdrawal request submitted successfully');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Confirm withdrawal request
exports.confirmWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { withdrawalId } = req.params;
    
    // Find withdrawal
    const withdrawal = await Withdrawal.findOne({ _id: withdrawalId, userId });
    if (!withdrawal) {
      return badRequestResponse('Withdrawal request not found', 'NOT_FOUND', 404, res);
    }
    
    if (withdrawal.status !== 'pending') {
      return badRequestResponse('Withdrawal already processed', 'INVALID_STATUS', 400, res);
    }
    
    // Find wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return badRequestResponse('Wallet not found', 'NOT_FOUND', 404, res);
    }
    
    // Check if there are still sufficient funds
    if (wallet.balance < withdrawal.amount) {
      return badRequestResponse('Insufficient funds', 'INSUFFICIENT_FUNDS', 400, res);
    }
    
    // Update withdrawal status
    withdrawal.status = 'processing';
    await withdrawal.save();
    
    // Update transaction status
    await Transaction.findByIdAndUpdate(
      withdrawal.transactionId,
      { status: 'completed' }
    );
    
    // Update wallet balance
    wallet.balance -= withdrawal.amount;
    wallet.withdrawn += withdrawal.amount;
    await wallet.save();
    
    return successResponse({
      withdrawalId: withdrawal._id,
      reference: withdrawal.reference,
      status: withdrawal.status,
      amount: withdrawal.amount
    }, res, 200, 'Withdrawal confirmed and in processing');
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get withdrawal details
exports.getWithdrawalDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { withdrawalId } = req.params;
    
    // Find withdrawal with transaction data
    const withdrawal = await Withdrawal.findOne({ _id: withdrawalId, userId })
      .populate('transactionId');
    
    if (!withdrawal) {
      return badRequestResponse('Withdrawal not found', 'NOT_FOUND', 404, res);
    }
    
    return successResponse({
      id: withdrawal._id,
      amount: withdrawal.amount,
      status: withdrawal.status,
      bankName: withdrawal.bankName,
      accountNumber: withdrawal.accountNumber,
      accountName: withdrawal.accountName,
      reference: withdrawal.reference,
      date: withdrawal.createdAt,
      transactionId: withdrawal.transactionId ? withdrawal.transactionId.reference : null
    }, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Get transaction details
exports.getTransactionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;
    
    // Find transaction
    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      userId 
    }).populate({
      path: 'metadata.courseId',
      select: 'title'
    });
    
    if (!transaction) {
      return badRequestResponse('Transaction not found', 'NOT_FOUND', 404, res);
    }
    
    // Format response based on transaction type
    let responseData = {
      id: transaction._id,
      reference: transaction.reference,
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.createdAt
    };
    
    if (transaction.type === 'course_purchase') {
      responseData.courseTitle = transaction.metadata.courseId ? transaction.metadata.courseId.title : null;
      responseData.platformShare = transaction.amount * 0.2; // 20% platform fee
      responseData.tutorEarnings = transaction.amount * 0.8; // 80% tutor earnings
    } else if (transaction.type === 'withdrawal') {
      responseData.bankName = transaction.metadata.bankName;
      responseData.accountNumber = transaction.metadata.accountNumber;
      responseData.accountName = transaction.metadata.accountName;
    } else if (transaction.type === 'platform_fee') {
      responseData.courseTitle = transaction.metadata.courseId ? transaction.metadata.courseId.title : null;
      responseData.percentage = "20%";
    }
    
    return successResponse(responseData, res);
  } catch (error) {
    return internalServerErrorResponse(error.message, res);
  }
};

// Update earnings when course is purchased
exports.updateEarningsFromPurchase = async (courseId, amount, paymentId) => {
  try {
    const course = await Course.findById(courseId).populate('tutorId');
    if (!course || !course.tutorId) {
      throw new Error('Course or tutor not found');
    }
    
    const tutorId = course.tutorId._id;
    
    // Find or create wallet
    let wallet = await Wallet.findOne({ userId: tutorId });
    if (!wallet) {
      wallet = new Wallet({ userId: tutorId });
    }
    
    // Calculate earnings (80% of course price)
    const tutorEarnings = amount * 0.8;
    const platformFee = amount * 0.2;
    
    // Update wallet
    wallet.balance += tutorEarnings;
    wallet.earned += tutorEarnings;
    await wallet.save();
    
    // Create earnings transaction
    const earningsTransaction = new Transaction({
      userId: tutorId,
      walletId: wallet._id,
      amount: tutorEarnings,
      type: 'earnings',
      status: 'completed',
      metadata: {
        courseId,
        paymentId
      },
      description: `Earnings from ${course.title}`
    });
    await earningsTransaction.save();
    
    // Create platform fee transaction
    const platformFeeTransaction = new Transaction({
      userId: tutorId,
      walletId: wallet._id,
      amount: platformFee,
      type: 'platform_fee',
      status: 'completed',
      metadata: {
        courseId,
        paymentId
      },
      description: `Platform fee for ${course.title}`
    });
    await platformFeeTransaction.save();
    
    return {
      earnings: tutorEarnings,
      platformFee,
      walletId: wallet._id
    };
  } catch (error) {
    console.error('Error updating earnings:', error);
    throw error;
  }
};


// Retry failed withdrawal
exports.retryWithdrawal = async (req, res) => {
    try {
      const userId = req.user.id;
      const { withdrawalId } = req.params;
      
      // Find failed withdrawal
      const withdrawal = await Withdrawal.findOne({ 
        _id: withdrawalId, 
        userId,
        status: 'failed' 
      });
      
      if (!withdrawal) {
        return badRequestResponse('Failed withdrawal not found or already processed', 'NOT_FOUND', 404, res);
      }
      
      // Find wallet and check balance
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return badRequestResponse('Wallet not found', 'NOT_FOUND', 404, res);
      }
      
      // Verify sufficient funds
      if (wallet.balance < withdrawal.amount) {
        return badRequestResponse('Insufficient funds', 'INSUFFICIENT_FUNDS', 400, res);
      }
      
      // Update withdrawal status
      withdrawal.status = 'pending';
      withdrawal.remarks = 'Retry after failure';
      withdrawal.updatedAt = Date.now();
      await withdrawal.save();
      
      // Create new transaction for retry
      const transaction = new Transaction({
        userId,
        walletId: wallet._id,
        amount: withdrawal.amount,
        type: 'withdrawal',
        status: 'pending',
        metadata: {
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber,
          accountName: withdrawal.accountName,
          withdrawalId: withdrawal._id
        },
        description: 'Retry withdrawal request'
      });
      await transaction.save();
      
      // Update withdrawal with new transaction reference
      withdrawal.transactionId = transaction._id;
      withdrawal.reference = transaction.reference;
      await withdrawal.save();
      
      return successResponse({
        withdrawalId: withdrawal._id,
        reference: withdrawal.reference,
        status: withdrawal.status
      }, res, 200, 'Withdrawal request resubmitted successfully');
    } catch (error) {
      return internalServerErrorResponse(error.message, res);
    }
};
  

// Get withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;
      
      // Build query
      const query = { userId };
      if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
        query.status = status;
      }
      
      // Get total count for pagination
      const total = await Withdrawal.countDocuments(query);
      
      // Get withdrawals with pagination
      const withdrawals = await Withdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const formatedList = withdrawals.map(w => ({
        id: w._id,
        amount: w.amount,
        status: w.status,
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        reference: w.reference,
        date: w.createdAt
      }))
      
    return paginationResponse(
        formatedList,
        total,
        parseInt(page),
        parseInt(limit),
        res,
        'History retrieved successfully'
        );
      
 
    } catch (error) {
      return internalServerErrorResponse(error.message, res);
    }
  
};
  

exports.getWallet = async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, type } = req.query;
      
      // Find or create wallet
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId });
        await wallet.save();
      }
      
      // Build query for transactions
      const query = { userId };
      if (type && ['course_purchase', 'withdrawal', 'platform_fee', 'earnings'].includes(type)) {
        query.type = type;
      }
      
      // Get total count for pagination
      const total = await Transaction.countDocuments(query);
      
      // Get transactions with pagination
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate({
          path: 'metadata.courseId',
          select: 'title'
        });
      
      // Format transactions to match UI requirements
      const formattedTransactions = transactions.map(t => {
        const baseTransaction = {
          id: t._id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          reference: t.reference,
          date: t.createdAt,
          formattedDate: new Date(t.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        };
        
        // Add type-specific fields
        switch (t.type) {
          case 'course_purchase':
            return {
              ...baseTransaction,
              description: 'Course Purchase',
              courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course'
            };
          case 'withdrawal':
            return {
              ...baseTransaction,
              description: 'Withdrawal',
              bankName: t.metadata.bankName,
              accountNumber: t.metadata.accountNumber
            };
          case 'platform_fee':
            return {
              ...baseTransaction,
              description: 'Platform Fee Deduction',
              courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course'
            };
          case 'earnings':
            return {
              ...baseTransaction,
              description: 'Course Earnings',
              courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course'
            };
          default:
            return {
              ...baseTransaction,
              description: 'Transaction'
            };
        }
      });
      
      return successResponse({
        wallet: {
          balance: wallet.balance,
          earned: wallet.earned,
          withdrawn: wallet.withdrawn,
          currency: wallet.currency
        },
        transactions: formattedTransactions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }, res);
    } catch (error) {
      return internalServerErrorResponse(error.message, res);
    }
  
};

// Get transaction history with filtering options
exports.getTransactionHistory = async (req, res) => {
try {
    const userId = req.user.id;
    const { 
    page = 1, 
    limit = 10, 
    type, 
    status,
    startDate,
    endDate
    } = req.query;
    
    // Build query
    const query = { userId };
    
    // Apply filters
    if (type && ['course_purchase', 'withdrawal', 'platform_fee', 'earnings'].includes(type)) {
    query.type = type;
    }
    
    if (status && ['pending', 'completed', 'failed'].includes(status)) {
    query.status = status;
    }
    
    // Date filtering
    if (startDate || endDate) {
    query.createdAt = {};
    
    if (startDate) {
        query.createdAt.$gte = new Date(startDate);
    }
    
    if (endDate) {
        query.createdAt.$lte = new Date(endDate);
    }
    }
    
    // Get total count for pagination
    const total = await Transaction.countDocuments(query);
    
    // Get transactions with pagination
    const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate({
        path: 'metadata.courseId',
        select: 'title'
    });
    
    // Format transactions to match the UI
    const formattedTransactions = transactions.map(t => {
    // Base transaction details
    const baseTransaction = {
        id: t._id,
        type: t.type,
        amount: t.amount,
        status: t.status,
        reference: t.reference,
        date: t.createdAt,
        formattedDate: new Date(t.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
        }),
        formattedTime: new Date(t.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
        })
    };
    
    // Type-specific details
    switch (t.type) {
        case 'course_purchase':
        return {
            ...baseTransaction,
            description: 'Course Purchase',
            courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course',
            icon: 'cart-shopping',
            statusClass: t.status === 'completed' ? 'completed' : (t.status === 'failed' ? 'failed' : 'pending')
        };
        case 'withdrawal':
        return {
            ...baseTransaction,
            description: 'Withdrawal',
            bankName: t.metadata.bankName,
            accountNumber: t.metadata.accountNumber,
            icon: 'money-bill-transfer',
            statusClass: t.status === 'completed' ? 'completed' : (t.status === 'failed' ? 'failed' : 'pending')
        };
        case 'platform_fee':
        return {
            ...baseTransaction,
            description: 'Platform Fee Deduction',
            courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course',
            icon: 'building',
            statusClass: t.status === 'completed' ? 'completed' : (t.status === 'failed' ? 'failed' : 'pending')
        };
        case 'earnings':
        return {
            ...baseTransaction,
            description: 'Course Earnings',
            courseTitle: t.metadata.courseId ? t.metadata.courseId.title : 'Unknown Course',
            icon: 'coins',
            statusClass: t.status === 'completed' ? 'completed' : (t.status === 'failed' ? 'failed' : 'pending')
        };
        default:
        return {
            ...baseTransaction,
            description: 'Transaction',
            icon: 'receipt',
            statusClass: t.status === 'completed' ? 'completed' : (t.status === 'failed' ? 'failed' : 'pending')
        };
    }
    });
    
    return paginationResponse(
        formattedTransactions,
          total,
          parseInt(page),
          parseInt(limit),
          res,
          'History retrieved successfully'
          );

    } catch (error) {
    return internalServerErrorResponse(error.message, res);
}
};

// Get transaction summary and statistics
exports.getTransactionStats = async (req, res) => {
try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
    case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
    case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    default:
        startDate.setMonth(startDate.getMonth() - 1); // Default to month
    }
    
    // Find wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
    return badRequestResponse('Wallet not found', 'NOT_FOUND', 404, res);
    }
    
    // Get transaction counts by type
    const typeStats = await Transaction.aggregate([
    { 
        $match: { 
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
        } 
    },
    { 
        $group: { 
        _id: '$type', 
        count: { $sum: 1 },
        total: { $sum: '$amount' }
        } 
    }
    ]);
    
    // Get transaction counts by status
    const statusStats = await Transaction.aggregate([
    { 
        $match: { 
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
        } 
    },
    { 
        $group: { 
        _id: '$status', 
        count: { $sum: 1 } 
        } 
    }
    ]);
    
    // Format statistics
    const statistics = {
    period,
    balance: wallet.balance,
    earned: wallet.earned,
    withdrawn: wallet.withdrawn,
    periodStats: {
        totalTransactions: typeStats.reduce((sum, stat) => sum + stat.count, 0),
        earnings: typeStats.find(stat => stat._id === 'earnings')?.total || 0,
        withdrawals: typeStats.find(stat => stat._id === 'withdrawal')?.total || 0,
        platformFees: typeStats.find(stat => stat._id === 'platform_fee')?.total || 0
    },
    statusBreakdown: {
        completed: statusStats.find(stat => stat._id === 'completed')?.count || 0,
        pending: statusStats.find(stat => stat._id === 'pending')?.count || 0,
        failed: statusStats.find(stat => stat._id === 'failed')?.count || 0
    },
    typeBreakdown: typeStats.reduce((obj, stat) => {
        obj[stat._id] = {
        count: stat.count,
        total: stat.total
        };
        return obj;
    }, {})
    };
    
    return successResponse(statistics, res);
} catch (error) {
    return internalServerErrorResponse(error.message, res);
}
};
  

