/**
 * poolRoutes.js
 * 
 * Express routes for pool management
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('./db');
const poolHelpers = require('./poolHelpers');
const receiptHelpers = require('./receiptHelpers');
const { commitPayment, getAlgodClient, getPooledAccount } = require('./commitPayment');
const algosdk = require('algosdk');

// ============================================================================
// POST /api/createPool
// ============================================================================

router.post('/createPool', async (req, res) => {
  try {
    const { listingID, targetAmount, maxParticipants, userId } = req.body;
    
    // Validate inputs
    if (!listingID || !targetAmount || !maxParticipants) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['listingID', 'targetAmount', 'maxParticipants']
      });
    }
    
    const targetNum = parseInt(targetAmount);
    const maxNum = parseInt(maxParticipants);
    
    if (isNaN(targetNum) || targetNum <= 0) {
      return res.status(400).json({
        error: 'Invalid targetAmount',
        message: 'Target amount must be a positive integer'
      });
    }
    
    if (isNaN(maxNum) || maxNum < 2 || maxNum > 100) {
      return res.status(400).json({
        error: 'Invalid maxParticipants',
        message: 'Max participants must be between 2 and 100'
      });
    }
    
    // Use provided userId or default to creator
    const creatorId = userId || 'anonymous';
    
    // Check if creator exists
    if (userId) {
      const user = db.getUser(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Creator user not found',
          userId
        });
      }
    }
    
    // Generate unique pool ID
    const poolID = `pool_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Create pool
    const pool = poolHelpers.createPool(poolID, listingID, targetNum, maxNum, creatorId);
    
    // Generate QR link
    const qrLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pool?id=${poolID}`;
    
    console.log(`✓ Pool created: ${poolID}`);
    
    res.status(201).json({
      success: true,
      poolID: pool.id,
      listingID: pool.listingID,
      targetAmount: pool.targetAmount,
      maxParticipants: pool.maxParticipants,
      currentAmount: pool.currentAmount,
      currentParticipants: pool.currentParticipants,
      status: pool.status,
      qrLink,
      creatorId: pool.creatorId,
      createdAt: pool.created_at
    });
  } catch (err) {
    console.error('Error creating pool:', err.message);
    res.status(500).json({
      error: 'Failed to create pool',
      message: err.message
    });
  }
});

// ============================================================================
// GET /api/pool/:poolID
// ============================================================================

router.get('/pool/:poolID', async (req, res) => {
  try {
    const { poolID } = req.params;
    
    if (!poolID) {
      return res.status(400).json({
        error: 'poolID is required'
      });
    }
    
    const poolData = poolHelpers.getPoolWithParticipants(poolID);
    
    if (!poolData) {
      return res.status(404).json({
        error: 'Pool not found',
        poolID
      });
    }
    
    // Calculate progress
    const progress = poolData.targetAmount > 0 
      ? ((poolData.currentAmount / poolData.targetAmount) * 100).toFixed(1)
      : 0;
    
    const isFull = poolData.currentAmount >= poolData.targetAmount ||
                   poolData.currentParticipants >= poolData.maxParticipants;
    
    res.json({
      ...poolData,
      progress: parseFloat(progress),
      isFull,
      canFinalize: poolData.currentAmount >= poolData.targetAmount,
      qrLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pool?id=${poolID}`
    });
  } catch (err) {
    console.error('Error getting pool:', err.message);
    res.status(500).json({
      error: 'Failed to get pool',
      message: err.message
    });
  }
});

// ============================================================================
// POST /api/joinPool
// ============================================================================

router.post('/joinPool', async (req, res) => {
  try {
    const { poolID, userId, amount } = req.body;
    
    // Validate inputs
    if (!poolID || !userId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['poolID', 'userId', 'amount']
      });
    }
    
    const amountNum = parseInt(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive integer'
      });
    }
    
    // Check if user exists
    const user = db.getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        userId
      });
    }
    
    // Get user balance
    const userBalance = db.getBalance(userId);
    
    console.log(`\n👥 User ${userId} joining pool ${poolID} with ${amountNum} microAlgos`);
    
    try {
      // Reserve funds in database
      db.debitBalance(userId, amountNum);
      
      // Join pool (this validates pool rules)
      const updatedPool = poolHelpers.joinPool(poolID, userId, amountNum, userBalance);
      
      // Record transaction
      db.recordTransaction(userId, 'pool_reserve', amountNum, null, 'reserved');
      
      console.log(`✓ User ${userId} joined pool successfully\n`);
      
      // Get updated pool with participants
      const poolData = poolHelpers.getPoolWithParticipants(poolID);
      
      res.status(200).json({
        success: true,
        poolID: poolData.id,
        currentAmount: poolData.currentAmount,
        targetAmount: poolData.targetAmount,
        currentParticipants: poolData.currentParticipants,
        maxParticipants: poolData.maxParticipants,
        progress: ((poolData.currentAmount / poolData.targetAmount) * 100).toFixed(1),
        participants: poolData.participants
      });
    } catch (poolErr) {
      // Rollback balance if pool join failed
      try {
        db.creditBalance(userId, amountNum);
        console.log(`✓ Rolled back balance for ${userId}`);
      } catch (rollbackErr) {
        console.error(`⚠️ Rollback failed: ${rollbackErr.message}`);
      }
      throw poolErr;
    }
  } catch (err) {
    console.error('Error joining pool:', err.message);
    
    // Return specific error messages
    let statusCode = 500;
    if (err.message.includes('not found') || err.message.includes('not active')) {
      statusCode = 404;
    } else if (err.message.includes('already joined') || err.message.includes('full') || 
               err.message.includes('exceed') || err.message.includes('Insufficient')) {
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      error: 'Failed to join pool',
      message: err.message
    });
  }
});

// ============================================================================
// POST /api/finalizePool
// ============================================================================

router.post('/finalizePool', async (req, res) => {
  try {
    const { poolID, sellerAddress, escrowAddress } = req.body;
    
    // Validate inputs
    if (!poolID) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['poolID']
      });
    }
    
    // Get pool
    const poolData = poolHelpers.getPoolWithParticipants(poolID);
    
    if (!poolData) {
      return res.status(404).json({
        error: 'Pool not found',
        poolID
      });
    }
    
    // Validate pool can be finalized
    if (poolData.status !== 'active') {
      return res.status(400).json({
        error: 'Pool is not active',
        status: poolData.status
      });
    }
    
    if (poolData.currentAmount < poolData.targetAmount) {
      return res.status(400).json({
        error: 'Pool has not reached target amount',
        current: poolData.currentAmount,
        target: poolData.targetAmount,
        remaining: poolData.targetAmount - poolData.currentAmount
      });
    }
    
    console.log(`\n💼 Finalizing pool ${poolID}`);
    console.log(`   Participants: ${poolData.currentParticipants}`);
    console.log(`   Total Amount: ${poolData.currentAmount} microAlgos\n`);
    
    // If no blockchain addresses provided, use placeholders for demo
    const finalSellerAddress = sellerAddress || process.env.POOLED_ADDRESS || 'SELLER_PLACEHOLDER';
    const finalEscrowAddress = escrowAddress || 'ESCROW_PLACEHOLDER';
    
    // Attempt to commit payment for the full pool amount
    try {
      // For demo, we'll use the pool creator as the "user" for the payment
      // In production, this would be a special pooled transaction
      const result = await commitPayment({
        userId: poolData.creatorId,
        listingID: poolData.listingID,
        amount: poolData.currentAmount,
        sellerAddress: finalSellerAddress,
        escrowAddress: finalEscrowAddress
      });
      
      if (result.ok) {
        // Mark pool as finalized
        poolHelpers.finalizePool(poolID, result.txid);
        
        // Create transaction records for all participants
        poolData.participants.forEach(participant => {
          db.recordTransaction(
            participant.userId,
            'pool_payment',
            participant.amount,
            result.txid,
            'confirmed'
          );
        });
        
        // Create receipts for all participants
        console.log('🧾 Creating receipts for pool participants...');
        const receipts = receiptHelpers.createPoolReceipts({
          txid: result.txid,
          listingID: poolData.listingID,
          poolID: poolID,
          participants: poolData.participants,
          totalAmount: poolData.currentAmount
        });
        console.log(`   ✓ Created ${receipts.length} receipts\n`);
        
        console.log(`✓ Pool ${poolID} finalized successfully\n`);
        
        res.status(200).json({
          success: true,
          poolID,
          txid: result.txid,
          round: result.round,
          totalAmount: poolData.currentAmount,
          participants: poolData.currentParticipants,
          receipts: receipts.length,
          explorer: `https://testnet.algoexplorer.io/tx/${result.txid}`
        });
      } else {
        throw new Error(result.error);
      }
    } catch (paymentErr) {
      console.error(`❌ Pool finalization failed: ${paymentErr.message}\n`);
      
      // Don't rollback participant balances here - they can still try again
      throw new Error(`Payment failed: ${paymentErr.message}`);
    }
  } catch (err) {
    console.error('Error finalizing pool:', err.message);
    res.status(500).json({
      error: 'Failed to finalize pool',
      message: err.message
    });
  }
});

// ============================================================================
// GET /api/pools (list active pools)
// ============================================================================

router.get('/pools', async (req, res) => {
  try {
    const pools = poolHelpers.getActivePools();
    
    // Enrich with progress data
    const enrichedPools = pools.map(pool => ({
      ...pool,
      progress: ((pool.currentAmount / pool.targetAmount) * 100).toFixed(1),
      isFull: pool.currentAmount >= pool.targetAmount || pool.currentParticipants >= pool.maxParticipants
    }));
    
    res.json({
      count: enrichedPools.length,
      pools: enrichedPools
    });
  } catch (err) {
    console.error('Error getting pools:', err.message);
    res.status(500).json({
      error: 'Failed to get pools',
      message: err.message
    });
  }
});

module.exports = router;

