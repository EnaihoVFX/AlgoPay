/**
 * poolHelpers.js
 * 
 * Database helper functions for pool management
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use the existing database connection
const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// ============================================================================
// Initialize Pool Tables
// ============================================================================

function initializePoolTables() {
  console.log('Initializing pool tables...');
  
  // Pools table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      listingID TEXT NOT NULL,
      targetAmount INTEGER NOT NULL,
      currentAmount INTEGER DEFAULT 0,
      maxParticipants INTEGER NOT NULL,
      currentParticipants INTEGER DEFAULT 0,
      creatorId TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      txid TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finalized_at TEXT,
      FOREIGN KEY (creatorId) REFERENCES users(id)
    )
  `);
  
  // Pool participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pool_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poolID TEXT NOT NULL,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'reserved',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (poolID) REFERENCES pools(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(poolID, userId)
    )
  `);
  
  console.log('✓ Pool tables ready');
}

// Initialize tables
initializePoolTables();

// ============================================================================
// Prepared Statements
// ============================================================================

const selectPool = db.prepare('SELECT * FROM pools WHERE id = ?');
const insertPool = db.prepare(`
  INSERT INTO pools (id, listingID, targetAmount, maxParticipants, creatorId)
  VALUES (?, ?, ?, ?, ?)
`);
const updatePoolAmounts = db.prepare(`
  UPDATE pools 
  SET currentAmount = ?, currentParticipants = ?
  WHERE id = ?
`);
const updatePoolStatus = db.prepare(`
  UPDATE pools 
  SET status = ?, txid = ?, finalized_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const insertParticipant = db.prepare(`
  INSERT INTO pool_participants (poolID, userId, amount)
  VALUES (?, ?, ?)
`);
const selectPoolParticipants = db.prepare(`
  SELECT * FROM pool_participants WHERE poolID = ? ORDER BY joined_at
`);
const updateParticipantStatus = db.prepare(`
  UPDATE pool_participants SET status = ? WHERE poolID = ? AND userId = ?
`);
const updateAllParticipantsStatus = db.prepare(`
  UPDATE pool_participants SET status = ? WHERE poolID = ?
`);

// ============================================================================
// Pool Functions
// ============================================================================

/**
 * Create a new pool
 */
function createPool(poolID, listingID, targetAmount, maxParticipants, creatorId) {
  try {
    insertPool.run(poolID, listingID, targetAmount, maxParticipants, creatorId);
    console.log(`✓ Created pool ${poolID} for listing ${listingID}`);
    return getPool(poolID);
  } catch (err) {
    console.error('Error creating pool:', err.message);
    throw err;
  }
}

/**
 * Get pool details
 */
function getPool(poolID) {
  try {
    return selectPool.get(poolID) || null;
  } catch (err) {
    console.error('Error getting pool:', err.message);
    throw err;
  }
}

/**
 * Get pool participants
 */
function getPoolParticipants(poolID) {
  try {
    return selectPoolParticipants.all(poolID);
  } catch (err) {
    console.error('Error getting pool participants:', err.message);
    throw err;
  }
}

/**
 * Join a pool
 */
function joinPool(poolID, userId, amount, userBalance) {
  const transaction = db.transaction(() => {
    // Get pool details
    const pool = getPool(poolID);
    if (!pool) {
      throw new Error('Pool not found');
    }
    
    if (pool.status !== 'active') {
      throw new Error('Pool is not active');
    }
    
    // Check if already joined
    const participants = getPoolParticipants(poolID);
    const alreadyJoined = participants.find(p => p.userId === userId);
    if (alreadyJoined) {
      throw new Error('User already joined this pool');
    }
    
    // Check max participants
    if (pool.currentParticipants >= pool.maxParticipants) {
      throw new Error('Pool is full');
    }
    
    // Check if adding this amount would exceed target
    const newTotal = pool.currentAmount + amount;
    if (newTotal > pool.targetAmount) {
      throw new Error(`Amount would exceed target. Max contribution: ${pool.targetAmount - pool.currentAmount}`);
    }
    
    // Check user balance
    if (userBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Add participant
    insertParticipant.run(poolID, userId, amount);
    
    // Update pool totals
    updatePoolAmounts.run(newTotal, pool.currentParticipants + 1, poolID);
    
    console.log(`✓ User ${userId} joined pool ${poolID} with ${amount} microAlgos`);
  });
  
  transaction();
  return getPool(poolID);
}

/**
 * Finalize pool
 */
function finalizePool(poolID, txid) {
  const transaction = db.transaction(() => {
    // Update pool status
    updatePoolStatus.run('finalized', txid, poolID);
    
    // Update all participants to 'spent'
    updateAllParticipantsStatus.run('spent', poolID);
    
    console.log(`✓ Pool ${poolID} finalized with txid ${txid}`);
  });
  
  transaction();
  return getPool(poolID);
}

/**
 * Rollback pool participant
 */
function rollbackPoolParticipant(poolID, userId, amount) {
  const transaction = db.transaction(() => {
    // Get pool
    const pool = getPool(poolID);
    if (!pool) return;
    
    // Update pool totals
    updatePoolAmounts.run(
      pool.currentAmount - amount,
      pool.currentParticipants - 1,
      poolID
    );
    
    // Remove participant
    db.prepare('DELETE FROM pool_participants WHERE poolID = ? AND userId = ?')
      .run(poolID, userId);
    
    console.log(`✓ Rolled back pool participation for ${userId}`);
  });
  
  transaction();
}

/**
 * Get pool with participants
 */
function getPoolWithParticipants(poolID) {
  const pool = getPool(poolID);
  if (!pool) return null;
  
  const participants = getPoolParticipants(poolID);
  
  return {
    ...pool,
    participants
  };
}

/**
 * Get all active pools
 */
function getActivePools() {
  try {
    return db.prepare("SELECT * FROM pools WHERE status = 'active' ORDER BY created_at DESC").all();
  } catch (err) {
    console.error('Error getting active pools:', err.message);
    throw err;
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  createPool,
  getPool,
  getPoolParticipants,
  joinPool,
  finalizePool,
  rollbackPoolParticipant,
  getPoolWithParticipants,
  getActivePools
};

