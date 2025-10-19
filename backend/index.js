/**
 * index.js
 * 
 * AlgoPay Backend API Server
 * 
 * SETUP:
 * 1. Ensure .env file contains PORT (default: 3000)
 * 2. Run: node backend/index.js
 * 
 * ENDPOINTS:
 * - GET  /health                    - Health check
 * - GET  /api/balance/:userId       - Get user balance
 * - POST /api/createUser            - Create new user
 * - GET  /api/users                 - Get all users
 * - GET  /api/transactions/:userId  - Get user transaction history
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const { commitPayment } = require('./commitPayment');
const poolRoutes = require('./poolRoutes');
const receiptHelpers = require('./receiptHelpers');
const { processWithdrawal, MIN_WITHDRAWAL, MAX_WITHDRAWAL } = require('./withdraw');
const listingHelpers = require('./listingHelpers');
const nftHelpers = require('./nftHelpers');

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Mount pool routes
app.use('/api', poolRoutes);

// ============================================================================
// API Routes
// ============================================================================

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AlgoPay API',
    version: '1.0.0'
  });
});

/**
 * Get user balance
 * GET /api/balance/:userId
 */
app.get('/api/balance/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
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
    
    // Get balance
    const balance = db.getBalance(userId);
    const balanceDetails = db.getBalanceDetails(userId);
    
    res.json({
      userId,
      balance,
      balanceAlgos: (balance / 1000000).toFixed(6),
      updatedAt: balanceDetails?.updated_at || null
    });
  } catch (err) {
    console.error('Error getting balance:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Create new user
 * POST /api/createUser
 * Body: { userId, name }
 */
app.post('/api/createUser', (req, res) => {
  try {
    const { userId, name } = req.body;
    
    // Validate input
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }
    
    if (!name) {
      return res.status(400).json({
        error: 'name is required'
      });
    }
    
    // Create user
    const user = db.createUser(userId, name);
    const balance = db.getBalance(userId);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        balance,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Error creating user:', err.message);
    
    if (err.message === 'User already exists') {
      return res.status(409).json({
        error: 'User already exists',
        message: err.message
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get all users
 * GET /api/users
 */
app.get('/api/users', (req, res) => {
  try {
    const users = db.getAllUsers();
    
    // Enrich with balance information
    const usersWithBalances = users.map(user => ({
      id: user.id,
      name: user.name,
      balance: db.getBalance(user.id),
      createdAt: user.created_at
    }));
    
    res.json({
      count: usersWithBalances.length,
      users: usersWithBalances
    });
  } catch (err) {
    console.error('Error getting users:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get user transaction history
 * GET /api/transactions/:userId
 */
app.get('/api/transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
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
    
    // Get transaction history
    const transactions = db.getTransactionHistory(userId, limit);
    
    res.json({
      userId,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error('Error getting transactions:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get listing details
 * GET /api/listing/:listingID
 */
app.get('/api/listing/:listingID', (req, res) => {
  try {
    const { listingID } = req.params;
    
    if (!listingID) {
      return res.status(400).json({
        error: 'listingID is required'
      });
    }
    
    // Get listing from database (REAL DATA - no mock)
    const listing = listingHelpers.getListing(listingID);
    
    if (!listing) {
      return res.status(404).json({
        error: 'Listing not found',
        listingID,
        message: 'Create a listing first using the /api/createListing endpoint'
      });
    }
    
    res.json(listing);
  } catch (err) {
    console.error('Error getting listing:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Create listing
 * POST /api/createListing
 */
app.post('/api/createListing', (req, res) => {
  try {
    const { id, title, description, price, sellerAddress, escrowAddress, image, rules, deadline } = req.body;
    
    if (!id || !title || !price || !sellerAddress || !escrowAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['id', 'title', 'price', 'sellerAddress', 'escrowAddress']
      });
    }
    
    const listing = listingHelpers.createListing({
      id,
      title,
      description: description || '',
      price: parseInt(price),
      sellerAddress,
      escrowAddress,
      image: image || `https://via.placeholder.com/400x300?text=${encodeURIComponent(id)}`,
      rules: rules || 'All sales final.',
      deadline: deadline || Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    });
    
    res.status(201).json({
      success: true,
      listing
    });
  } catch (err) {
    console.error('Error creating listing:', err.message);
    res.status(500).json({
      error: 'Failed to create listing',
      message: err.message
    });
  }
});

/**
 * Commit payment to marketplace listing
 * POST /api/pay
 * Body: { userId, listingID, amount, sellerAddress, escrowAddress }
 */
app.post('/api/pay', async (req, res) => {
  try {
    const { userId, listingID, amount, sellerAddress, escrowAddress } = req.body;
    
    // Validate required fields
    if (!userId || !listingID || !amount || !sellerAddress || !escrowAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'listingID', 'amount', 'sellerAddress', 'escrowAddress']
      });
    }
    
    // Validate amount
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
    
    // Check if user has sufficient balance
    const currentBalance = db.getBalance(userId);
    if (currentBalance < amountNum) {
      return res.status(400).json({
        error: 'Insufficient balance',
        current: currentBalance,
        required: amountNum,
        shortfall: amountNum - currentBalance
      });
    }
    
    // Commit payment
    console.log(`\n📤 Payment request received from ${userId} for listing ${listingID}`);
    const result = await commitPayment({
      userId,
      listingID,
      amount: amountNum,
      sellerAddress,
      escrowAddress
    });
    
    if (result.ok) {
      res.status(200).json({
        success: true,
        txid: result.txid,
        round: result.round,
        amount: result.amount,
        listingID: result.listingID,
        userId: result.userId,
        explorer: `https://testnet.algoexplorer.io/tx/${result.txid}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        userId: result.userId,
        listingID: result.listingID
      });
    }
  } catch (err) {
    console.error('Error processing payment:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get user receipts
 * GET /api/receipts/:userId
 */
app.get('/api/receipts/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }
    
    // Get user receipts
    const receipts = receiptHelpers.getUserReceipts(userId);
    
    // Enrich with explorer links
    const enrichedReceipts = receipts.map(receipt => ({
      ...receipt,
      explorerLink: `https://testnet.algoexplorer.io/tx/${receipt.txid}`,
      amountAlgo: (receipt.amount / 1000000).toFixed(6),
      isPool: receipt.type === 'pool',
      participantCount: receipt.participants?.length || 1
    }));
    
    res.json({
      userId,
      count: enrichedReceipts.length,
      receipts: enrichedReceipts
    });
  } catch (err) {
    console.error('Error getting receipts:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Process withdrawal
 * POST /api/withdraw
 * Body: { userId, toAddress, amount }
 */
app.post('/api/withdraw', async (req, res) => {
  try {
    const { userId, toAddress, amount } = req.body;
    
    // Validate required fields
    if (!userId || !toAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'toAddress', 'amount']
      });
    }
    
    // Validate amount
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive integer'
      });
    }
    
    // Validate amount limits
    if (amountNum < MIN_WITHDRAWAL) {
      return res.status(400).json({
        error: 'Amount below minimum',
        minimum: MIN_WITHDRAWAL,
        minimumAlgo: (MIN_WITHDRAWAL / 1000000).toFixed(6)
      });
    }
    
    if (amountNum > MAX_WITHDRAWAL) {
      return res.status(400).json({
        error: 'Amount exceeds maximum',
        maximum: MAX_WITHDRAWAL,
        maximumAlgo: (MAX_WITHDRAWAL / 1000000).toFixed(6)
      });
    }
    
    // Validate address
    const algosdk = require('algosdk');
    console.log('DEBUG: Validating address:', toAddress, 'Type:', typeof toAddress);
    
    // Ensure it's a string
    const addressString = String(toAddress);
    console.log('DEBUG: After String conversion:', addressString, 'Type:', typeof addressString);
    
    if (!algosdk.isValidAddress(addressString)) {
      return res.status(400).json({
        error: 'Invalid destination address',
        message: 'Please provide a valid Algorand address'
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
    
    // Check if user has sufficient balance
    const currentBalance = db.getBalance(userId);
    if (currentBalance < amountNum) {
      return res.status(400).json({
        error: 'Insufficient balance',
        current: currentBalance,
        currentAlgo: (currentBalance / 1000000).toFixed(6),
        requested: amountNum,
        requestedAlgo: (amountNum / 1000000).toFixed(6),
        shortfall: amountNum - currentBalance
      });
    }
    
    // Process withdrawal
    console.log(`\n💸 Withdrawal request from ${userId} to ${addressString}`);
    const result = await processWithdrawal({
      userId,
      toAddress: addressString,
      amount: amountNum
    });
    
    if (result.success) {
      res.status(200).json({
        success: true,
        txid: result.txid,
        round: result.round,
        amount: result.amount,
        amountAlgo: (result.amount / 1000000).toFixed(6),
        toAddress: result.toAddress,
        userId: result.userId,
        newBalance: result.newBalance,
        newBalanceAlgo: (result.newBalance / 1000000).toFixed(6),
        receiptId: result.receiptId,
        explorer: `https://testnet.algoexplorer.io/tx/${result.txid}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        userId: result.userId,
        toAddress: result.toAddress,
        amount: result.amount
      });
    }
  } catch (err) {
    console.error('Error processing withdrawal:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ============================================================================
// NFT Endpoints
// ============================================================================

/**
 * Create a claimable NFT
 * POST /api/nft/create
 * Body: { name, unitName, description, imageUrl, metadataUrl, creatorUserId }
 */
app.post('/api/nft/create', async (req, res) => {
  try {
    const { name, unitName, description, imageUrl, metadataUrl, creatorUserId } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: name'
      });
    }
    
    console.log(`\n🎨 NFT creation request from ${creatorUserId || 'anonymous'}`);
    
    const result = await nftHelpers.createClaimableNFT({
      name,
      unitName: unitName || 'NFT',
      description: description || '',
      imageUrl: imageUrl || '',
      metadataUrl: metadataUrl || '',
      total: 1,
      decimals: 0,
      creatorUserId
    });
    
    res.status(201).json(result);
    
  } catch (err) {
    console.error('Error creating NFT:', err.message);
    res.status(500).json({
      error: 'Failed to create NFT',
      message: err.message
    });
  }
});

/**
 * Get NFT by claim code
 * GET /api/nft/claim/:claimCode
 */
app.get('/api/nft/claim/:claimCode', (req, res) => {
  try {
    const { claimCode } = req.params;
    
    if (!claimCode) {
      return res.status(400).json({
        error: 'Claim code is required'
      });
    }
    
    const nft = nftHelpers.getNFTByClaimCode(claimCode);
    
    if (!nft) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'Invalid claim code or NFT does not exist'
      });
    }
    
    res.json({
      assetId: nft.assetId,
      name: nft.name,
      unitName: nft.unitName,
      description: nft.description,
      imageUrl: nft.imageUrl,
      creator: nft.creator,
      status: nft.status,
      claimedBy: nft.claimedBy,
      claimedAt: nft.claimedAt,
      explorerUrl: `https://testnet.algoexplorer.io/asset/${nft.assetId}`
    });
    
  } catch (err) {
    console.error('Error getting NFT:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Claim an NFT
 * POST /api/nft/claim
 * Body: { claimCode, recipientAddress, userId }
 */
app.post('/api/nft/claim', async (req, res) => {
  try {
    const { claimCode, recipientAddress, userId } = req.body;
    
    if (!claimCode || !recipientAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['claimCode', 'recipientAddress']
      });
    }
    
    console.log(`\n🎫 NFT claim request for code: ${claimCode}`);
    
    const result = await nftHelpers.claimNFT(claimCode, recipientAddress, userId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (err) {
    console.error('Error claiming NFT:', err.message);
    
    const statusCode = err.message.includes('already claimed') ? 409 :
                       err.message.includes('Invalid') ? 404 : 500;
    
    res.status(statusCode).json({
      error: 'Failed to claim NFT',
      message: err.message
    });
  }
});

/**
 * Opt-in to NFT asset
 * POST /api/nft/optin
 * Body: { assetId, userAddress }
 */
app.post('/api/nft/optin', async (req, res) => {
  try {
    const { assetId, userAddress } = req.body;
    
    if (!assetId || !userAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['assetId', 'userAddress']
      });
    }
    
    const result = await nftHelpers.optInToNFT(parseInt(assetId), userAddress);
    
    res.json(result);
    
  } catch (err) {
    console.error('Error opting in:', err.message);
    res.status(500).json({
      error: 'Failed to opt-in',
      message: err.message
    });
  }
});

/**
 * Get user's created NFTs
 * GET /api/nft/created/:userId
 */
app.get('/api/nft/created/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const nfts = nftHelpers.getUserCreatedNFTs(userId);
    
    res.json({
      userId,
      count: nfts.length,
      nfts
    });
    
  } catch (err) {
    console.error('Error getting created NFTs:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get user's claimed NFTs
 * GET /api/nft/claimed/:userId
 */
app.get('/api/nft/claimed/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const nfts = nftHelpers.getUserClaimedNFTs(userId);
    
    res.json({
      userId,
      count: nfts.length,
      nfts
    });
    
  } catch (err) {
    console.error('Error getting claimed NFTs:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get all unclaimed NFTs
 * GET /api/nft/unclaimed
 */
app.get('/api/nft/unclaimed', (req, res) => {
  try {
    const nfts = nftHelpers.getAllUnclaimedNFTs();
    
    res.json({
      count: nfts.length,
      nfts
    });
    
  } catch (err) {
    console.error('Error getting unclaimed NFTs:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

/**
 * Get user details (user info + balance)
 * GET /api/user/:userId
 */
app.get('/api/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }
    
    // Get user
    const user = db.getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        userId
      });
    }
    
    // Get balance
    const balance = db.getBalance(userId);
    const balanceDetails = db.getBalanceDetails(userId);
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.created_at
      },
      balance: {
        microAlgos: balance,
        algos: (balance / 1000000).toFixed(6),
        updatedAt: balanceDetails?.updated_at || null
      }
    });
  } catch (err) {
    console.error('Error getting user:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 AlgoPay API Server Started');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('');
  console.log('   Core:');
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/balance/:userId`);
  console.log(`   POST http://localhost:${PORT}/api/createUser`);
  console.log(`   GET  http://localhost:${PORT}/api/users`);
  console.log(`   GET  http://localhost:${PORT}/api/user/:userId`);
  console.log('');
  console.log('   Payments:');
  console.log(`   POST http://localhost:${PORT}/api/pay`);
  console.log(`   POST http://localhost:${PORT}/api/withdraw`);
  console.log(`   GET  http://localhost:${PORT}/api/receipts/:userId`);
  console.log('');
  console.log('   Listings:');
  console.log(`   GET  http://localhost:${PORT}/api/listing/:listingID`);
  console.log(`   POST http://localhost:${PORT}/api/createListing`);
  console.log('');
  console.log('   Pools:');
  console.log(`   POST http://localhost:${PORT}/api/createPool`);
  console.log(`   GET  http://localhost:${PORT}/api/pool/:poolID`);
  console.log(`   POST http://localhost:${PORT}/api/joinPool`);
  console.log(`   POST http://localhost:${PORT}/api/finalizePool`);
  console.log(`   GET  http://localhost:${PORT}/api/pools`);
  console.log('');
  console.log('   🎨 NFTs:');
  console.log(`   POST http://localhost:${PORT}/api/nft/create`);
  console.log(`   GET  http://localhost:${PORT}/api/nft/claim/:claimCode`);
  console.log(`   POST http://localhost:${PORT}/api/nft/claim`);
  console.log(`   POST http://localhost:${PORT}/api/nft/optin`);
  console.log(`   GET  http://localhost:${PORT}/api/nft/created/:userId`);
  console.log(`   GET  http://localhost:${PORT}/api/nft/claimed/:userId`);
  console.log(`   GET  http://localhost:${PORT}/api/nft/unclaimed`);
  console.log('');
  console.log('💡 Press Ctrl+C to stop');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  db.db.close();
  console.log('✓ Database closed');
  process.exit(0);
});

module.exports = app;

