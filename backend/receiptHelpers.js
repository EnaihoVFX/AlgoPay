/**
 * receiptHelpers.js
 * 
 * Receipt management for AlgoPay transactions
 * 
 * Receipts are created when:
 * - Individual payments are committed
 * - Pool payments are finalized
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

// Use the existing database connection
const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// ============================================================================
// Initialize Receipts Table
// ============================================================================

function initializeReceiptsTable() {
  console.log('Initializing receipts table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      receiptId TEXT PRIMARY KEY,
      txid TEXT NOT NULL,
      listingID TEXT NOT NULL,
      userId TEXT,
      poolID TEXT,
      amount INTEGER NOT NULL,
      participants TEXT,
      type TEXT DEFAULT 'individual',
      status TEXT DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (poolID) REFERENCES pools(id)
    )
  `);
  
  console.log('✓ Receipts table ready');
}

// Initialize table
initializeReceiptsTable();

// ============================================================================
// Prepared Statements
// ============================================================================

const insertReceipt = db.prepare(`
  INSERT INTO receipts (receiptId, txid, listingID, userId, poolID, amount, participants, type, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectUserReceipts = db.prepare(`
  SELECT * FROM receipts 
  WHERE userId = ? OR receiptId IN (
    SELECT receiptId FROM receipts WHERE participants LIKE '%' || ? || '%'
  )
  ORDER BY created_at DESC
`);

const selectReceiptById = db.prepare(`
  SELECT * FROM receipts WHERE receiptId = ?
`);

const selectReceiptByTxid = db.prepare(`
  SELECT * FROM receipts WHERE txid = ?
`);

// ============================================================================
// Receipt Functions
// ============================================================================

/**
 * Generate unique receipt ID
 */
function generateReceiptId() {
  return `receipt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Create receipt for individual payment
 * @param {object} params - Receipt parameters
 * @returns {object} - Created receipt
 */
function createIndividualReceipt({ txid, listingID, userId, amount }) {
  try {
    const receiptId = generateReceiptId();
    
    const participants = JSON.stringify([{
      userId,
      amount,
      share: 100
    }]);
    
    insertReceipt.run(
      receiptId,
      txid,
      listingID,
      userId,
      null, // no poolID
      amount,
      participants,
      'individual',
      'confirmed'
    );
    
    console.log(`✓ Created receipt ${receiptId} for user ${userId}`);
    
    return selectReceiptById.get(receiptId);
  } catch (err) {
    console.error('Error creating individual receipt:', err.message);
    throw err;
  }
}

/**
 * Create receipts for pool payment
 * @param {object} params - Receipt parameters
 * @returns {array} - Array of created receipts
 */
function createPoolReceipts({ txid, listingID, poolID, participants, totalAmount }) {
  try {
    const receipts = [];
    
    // Create participant data
    const participantData = participants.map(p => ({
      userId: p.userId,
      amount: p.amount,
      share: ((p.amount / totalAmount) * 100).toFixed(2)
    }));
    
    const participantsJson = JSON.stringify(participantData);
    
    // Create one receipt per participant
    participants.forEach(participant => {
      const receiptId = generateReceiptId();
      
      insertReceipt.run(
        receiptId,
        txid,
        listingID,
        participant.userId,
        poolID,
        participant.amount,
        participantsJson,
        'pool',
        'confirmed'
      );
      
      receipts.push(selectReceiptById.get(receiptId));
      
      console.log(`✓ Created pool receipt ${receiptId} for ${participant.userId}`);
    });
    
    return receipts;
  } catch (err) {
    console.error('Error creating pool receipts:', err.message);
    throw err;
  }
}

/**
 * Get user's receipts
 * @param {string} userId - User ID
 * @returns {array} - Array of receipts
 */
function getUserReceipts(userId) {
  try {
    const receipts = selectUserReceipts.all(userId, userId);
    
    // Parse participants JSON
    return receipts.map(receipt => ({
      ...receipt,
      participants: receipt.participants ? JSON.parse(receipt.participants) : []
    }));
  } catch (err) {
    console.error('Error getting user receipts:', err.message);
    throw err;
  }
}

/**
 * Get receipt by ID
 * @param {string} receiptId - Receipt ID
 * @returns {object} - Receipt object
 */
function getReceiptById(receiptId) {
  try {
    const receipt = selectReceiptById.get(receiptId);
    
    if (!receipt) return null;
    
    return {
      ...receipt,
      participants: receipt.participants ? JSON.parse(receipt.participants) : []
    };
  } catch (err) {
    console.error('Error getting receipt:', err.message);
    throw err;
  }
}

/**
 * Get receipt by transaction ID
 * @param {string} txid - Blockchain transaction ID
 * @returns {object} - Receipt object
 */
function getReceiptByTxid(txid) {
  try {
    const receipt = selectReceiptByTxid.get(txid);
    
    if (!receipt) return null;
    
    return {
      ...receipt,
      participants: receipt.participants ? JSON.parse(receipt.participants) : []
    };
  } catch (err) {
    console.error('Error getting receipt by txid:', err.message);
    throw err;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  createIndividualReceipt,
  createPoolReceipts,
  getUserReceipts,
  getReceiptById,
  getReceiptByTxid,
  generateReceiptId
};

