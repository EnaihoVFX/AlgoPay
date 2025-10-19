/**
 * nftHelpers.js
 * 
 * Helper functions for NFT creation and claiming on Algorand
 * 
 * FEATURES:
 * - Mint claimable NFTs
 * - Generate claim codes
 * - Process NFT claims
 * - Track NFT ownership
 */

const algosdk = require('algosdk');
const crypto = require('crypto');
const db = require('./db');

// ============================================================================
// Configuration
// ============================================================================

const ALGOD_URL = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const POOLED_MNEMONIC = process.env.POOLED_MNEMONIC;

// ============================================================================
// Database Setup
// ============================================================================

function initializeNFTTables() {
  // NFT Assets table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS nft_assets (
      assetId INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      unitName TEXT,
      description TEXT,
      imageUrl TEXT,
      metadataUrl TEXT,
      total INTEGER DEFAULT 1,
      decimals INTEGER DEFAULT 0,
      creator TEXT,
      creatorUserId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      claimable INTEGER DEFAULT 1,
      claimCode TEXT UNIQUE
    )
  `);
  
  // NFT Claims table  
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS nft_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      claimCode TEXT NOT NULL,
      claimedBy TEXT,
      claimedByUserId TEXT,
      claimedAt TEXT,
      txid TEXT,
      status TEXT DEFAULT 'unclaimed',
      FOREIGN KEY (assetId) REFERENCES nft_assets(assetId)
    )
  `);
  
  console.log('✓ NFT tables initialized');
}

// Initialize on load
initializeNFTTables();

// ============================================================================
// Helper Functions
// ============================================================================

function getAlgodClient() {
  const token = ALGOD_TOKEN ? { 'X-API-Key': ALGOD_TOKEN } : {};
  return new algosdk.Algodv2(token, ALGOD_URL, '');
}

function getPooledAccount() {
  if (!POOLED_MNEMONIC) {
    throw new Error('POOLED_MNEMONIC not configured in .env');
  }
  
  return algosdk.mnemonicToSecretKey(POOLED_MNEMONIC);
}

function generateClaimCode() {
  return crypto.randomBytes(16).toString('hex');
}

// ============================================================================
// NFT Creation
// ============================================================================

/**
 * Create a claimable NFT on Algorand
 */
async function createClaimableNFT(options) {
  const {
    name,
    unitName = 'NFT',
    description = '',
    imageUrl = '',
    metadataUrl = '',
    total = 1,
    decimals = 0,
    creatorUserId = null
  } = options;
  
  try {
    console.log(`\n🎨 Creating NFT: ${name}`);
    
    // Get creator account
    const creatorAccount = getPooledAccount();
    
    // Connect to Algorand
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    
    // Generate unique claim code
    const claimCode = generateClaimCode();
    
    // Prepare metadata
    const metadata = {
      name,
      description,
      image: imageUrl,
      properties: {
        claimable: true,
        claimCode: claimCode
      }
    };
    
    const note = new Uint8Array(
      Buffer.from(JSON.stringify(metadata).slice(0, 1000))
    );
    
    const txnParams = {
      from: creatorAccount.addr,
      total: total,
      decimals: decimals,
      defaultFrozen: false,
      manager: creatorAccount.addr,
      reserve: creatorAccount.addr,
      freeze: creatorAccount.addr,
      clawback: creatorAccount.addr,
      assetName: name.substring(0, 32), // Max 32 bytes
      unitName: unitName.substring(0, 8), // Max 8 bytes
      note: note,
      suggestedParams: params
    };
    
    // Only add assetURL if provided
    if (metadataUrl || imageUrl) {
      txnParams.assetURL = (metadataUrl || imageUrl).substring(0, 96);
    }
    
    // Create asset transaction
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(txnParams);
    
    // Sign and send
    const signedTxn = assetCreateTxn.signTxn(creatorAccount.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    console.log(`   Transaction ID: ${txId}`);
    
    // Wait for confirmation
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    const assetId = confirmedTxn['asset-index'];
    
    console.log(`   ✓ NFT Created! Asset ID: ${assetId}`);
    
    // Store in database
    const insertAsset = db.db.prepare(`
      INSERT INTO nft_assets (
        assetId, name, unitName, description, imageUrl, metadataUrl,
        total, decimals, creator, creatorUserId, claimCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertAsset.run(
      assetId,
      name,
      unitName,
      description,
      imageUrl,
      metadataUrl,
      total,
      decimals,
      creatorAccount.addr,
      creatorUserId,
      claimCode
    );
    
    const insertClaim = db.db.prepare(`
      INSERT INTO nft_claims (assetId, claimCode, status)
      VALUES (?, ?, 'unclaimed')
    `);
    
    insertClaim.run(assetId, claimCode);
    
    return {
      success: true,
      assetId,
      claimCode,
      txId,
      name,
      unitName,
      explorerUrl: `https://testnet.algoexplorer.io/asset/${assetId}`,
      claimUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay?type=nft&claim=${claimCode}`
    };
    
  } catch (err) {
    console.error('Error creating NFT:', err.message);
    throw new Error(`Failed to create NFT: ${err.message}`);
  }
}

// ============================================================================
// NFT Claiming
// ============================================================================

/**
 * Get NFT information by claim code
 */
function getNFTByClaimCode(claimCode) {
  try {
    const stmt = db.db.prepare(`
      SELECT a.*, c.status, c.claimedBy, c.claimedAt
      FROM nft_assets a
      JOIN nft_claims c ON a.assetId = c.assetId
      WHERE c.claimCode = ?
    `);
    
    return stmt.get(claimCode);
  } catch (err) {
    console.error('Error getting NFT by claim code:', err.message);
    return null;
  }
}

/**
 * Claim an NFT and transfer to user
 */
async function claimNFT(claimCode, recipientAddress, userId = null) {
  try {
    console.log(`\n🎫 Processing NFT claim: ${claimCode}`);
    
    // Get NFT info
    const nft = getNFTByClaimCode(claimCode);
    
    if (!nft) {
      throw new Error('Invalid claim code');
    }
    
    if (nft.status === 'claimed') {
      throw new Error('NFT already claimed');
    }
    
    // Validate recipient address
    if (!algosdk.isValidAddress(recipientAddress)) {
      throw new Error('Invalid recipient address');
    }
    
    console.log(`   NFT: ${nft.name} (Asset ID: ${nft.assetId})`);
    console.log(`   Recipient: ${recipientAddress}`);
    
    // Get creator account (holder of NFT)
    const creatorAccount = getPooledAccount();
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    
    // Check if recipient has opted-in to the asset
    console.log('   Checking if recipient has opted-in...');
    const accountInfo = await algodClient.accountInformation(recipientAddress).do();
    const hasOptedIn = accountInfo.assets?.some(asset => asset['asset-id'] === nft.assetId);
    
    if (!hasOptedIn) {
      console.log('   Recipient has not opted-in. Checking if auto opt-in is possible...');
      // Only auto opt-in if recipient is the pooled wallet
      if (recipientAddress === creatorAccount.addr) {
        console.log('   Auto-opting in pooled wallet...');
        const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: recipientAddress,
          to: recipientAddress,
          assetIndex: nft.assetId,
          amount: 0,
          suggestedParams: params
        });
        
        const signedOptIn = optInTxn.signTxn(creatorAccount.sk);
        const { txId: optInTxId } = await algodClient.sendRawTransaction(signedOptIn).do();
        await algosdk.waitForConfirmation(algodClient, optInTxId, 4);
        console.log('   ✓ Opt-in successful');
      } else {
        // For other wallets, they need to opt-in themselves first
        throw new Error(`Recipient must opt-in to asset ${nft.assetId} before claiming. Visit https://testnet.algoexplorer.io/asset/${nft.assetId} for more info.`);
      }
    } else {
      console.log('   ✓ Recipient already opted-in');
    }
    
    // Create transfer transaction
    console.log('   Creating transfer transaction...');
    const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: creatorAccount.addr,
      to: recipientAddress,
      assetIndex: nft.assetId,
      amount: 1,
      note: new Uint8Array(Buffer.from(`NFT Claim: ${claimCode}`)),
      suggestedParams: params
    });
    
    // Sign and send
    const signedTxn = assetTransferTxn.signTxn(creatorAccount.sk);
    
    try {
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      console.log(`   Transfer TX: ${txId}`);
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      console.log(`   ✓ Transfer confirmed in round ${confirmedTxn['confirmed-round']}`);
      
      // Update claim status in database
      const updateClaim = db.db.prepare(`
        UPDATE nft_claims
        SET status = 'claimed',
            claimedBy = ?,
            claimedByUserId = ?,
            claimedAt = CURRENT_TIMESTAMP,
            txid = ?
        WHERE claimCode = ?
      `);
      
      updateClaim.run(recipientAddress, userId, txId, claimCode);
      
      console.log(`   ✓ NFT successfully claimed!\n`);
      
      return {
        success: true,
        assetId: nft.assetId,
        name: nft.name,
        txId,
        explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`
      };
      
    } catch (transferErr) {
      if (transferErr.message.includes('receiver error') || transferErr.message.includes('asset')) {
        throw new Error('Recipient must opt-in to the asset first. Asset ID: ' + nft.assetId);
      }
      throw transferErr;
    }
    
  } catch (err) {
    console.error('Error claiming NFT:', err.message);
    throw err;
  }
}

/**
 * Opt-in to an NFT asset (prepare to receive)
 */
async function optInToNFT(assetId, userAddress) {
  try {
    console.log(`\n🔓 Opting in to NFT asset: ${assetId}`);
    
    // In a real app, user would sign this with their own wallet
    // For demo, we'll use pooled account
    const account = getPooledAccount();
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    
    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: account.addr,
      to: account.addr,
      assetIndex: assetId,
      amount: 0,
      suggestedParams: params
    });
    
    const signedTxn = optInTxn.signTxn(account.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    
    await algosdk.waitForConfirmation(algodClient, txId, 4);
    
    console.log(`   ✓ Opted in! TX: ${txId}\n`);
    
    return {
      success: true,
      txId
    };
    
  } catch (err) {
    console.error('Error opting in:', err.message);
    throw err;
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get all NFTs created by a user
 */
function getUserCreatedNFTs(userId) {
  try {
    const stmt = db.db.prepare(`
      SELECT * FROM nft_assets
      WHERE creatorUserId = ?
      ORDER BY createdAt DESC
    `);
    
    return stmt.all(userId);
  } catch (err) {
    console.error('Error getting user created NFTs:', err.message);
    return [];
  }
}

/**
 * Get all NFTs claimed by a user
 */
function getUserClaimedNFTs(userId) {
  try {
    const stmt = db.db.prepare(`
      SELECT a.*, c.claimedAt, c.txid
      FROM nft_assets a
      JOIN nft_claims c ON a.assetId = c.assetId
      WHERE c.claimedByUserId = ? AND c.status = 'claimed'
      ORDER BY c.claimedAt DESC
    `);
    
    return stmt.all(userId);
  } catch (err) {
    console.error('Error getting user claimed NFTs:', err.message);
    return [];
  }
}

/**
 * Get all unclaimed NFTs
 */
function getAllUnclaimedNFTs() {
  try {
    const stmt = db.db.prepare(`
      SELECT a.*, c.claimCode
      FROM nft_assets a
      JOIN nft_claims c ON a.assetId = c.assetId
      WHERE c.status = 'unclaimed'
      ORDER BY a.createdAt DESC
    `);
    
    return stmt.all();
  } catch (err) {
    console.error('Error getting unclaimed NFTs:', err.message);
    return [];
  }
}

/**
 * Get NFT by asset ID
 */
function getNFTByAssetId(assetId) {
  try {
    const stmt = db.db.prepare(`
      SELECT * FROM nft_assets
      WHERE assetId = ?
    `);
    
    return stmt.get(assetId);
  } catch (err) {
    console.error('Error getting NFT by asset ID:', err.message);
    return null;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  createClaimableNFT,
  claimNFT,
  optInToNFT,
  getNFTByClaimCode,
  getNFTByAssetId,
  getUserCreatedNFTs,
  getUserClaimedNFTs,
  getAllUnclaimedNFTs,
  generateClaimCode
};

