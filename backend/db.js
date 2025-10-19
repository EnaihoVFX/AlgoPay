/**
 * db.js
 * 
 * Database helper functions for AlgoPay using better-sqlite3
 * 
 * This module provides:
 * - Database initialization and table creation
 * - User management functions
 * - Balance management functions
 * - Transaction helpers
 */

const Database = require('better-sqlite3');
const path = require('path');

// ============================================================================
// Database Setup
// ============================================================================

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

console.log(`📦 Database connected: ${DB_PATH}`);

// ============================================================================
// Initialize Tables
// ============================================================================

function initializeTables() {
  console.log('Initializing database tables...');
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Balances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS balances (
      userId TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  
  // Deposits table (incoming transactions from blockchain)
  db.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      txid TEXT PRIMARY KEY,
      userId TEXT,
      amount INTEGER,
      sender TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  
  // Transactions table (withdrawals and other operations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      type TEXT,
      amount INTEGER,
      txid TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  
  console.log('✓ Database tables ready');
}

// Initialize tables on module load
initializeTables();

// ============================================================================
// Prepared Statements
// ============================================================================

const selectUser = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(`
  INSERT INTO users (id, name)
  VALUES (?, ?)
`);
const upsertBalance = db.prepare(`
  INSERT INTO balances (userId, balance, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(userId) DO UPDATE SET 
    balance = balance + excluded.balance,
    updated_at = CURRENT_TIMESTAMP
`);
const selectBalance = db.prepare(`
  SELECT userId, balance, updated_at 
  FROM balances 
  WHERE userId = ?
`);
const updateBalance = db.prepare(`
  UPDATE balances 
  SET balance = ?, updated_at = CURRENT_TIMESTAMP 
  WHERE userId = ?
`);

// ============================================================================
// User Functions
// ============================================================================

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {object|null} - User object or null if not found
 */
function getUser(userId) {
  try {
    const user = selectUser.get(userId);
    return user || null;
  } catch (err) {
    console.error('Error getting user:', err.message);
    throw new Error('Database error: Could not retrieve user');
  }
}

/**
 * Create a new user
 * @param {string} userId - User ID
 * @param {string} name - User name
 * @returns {object} - Created user object
 */
function createUser(userId, name) {
  try {
    // Check if user already exists
    const existing = getUser(userId);
    if (existing) {
      throw new Error('User already exists');
    }
    
    // Create user in a transaction
    const transaction = db.transaction(() => {
      // Insert user
      insertUser.run(userId, name);
      
      // Initialize balance to 0
      updateBalance.run(0, userId);
      upsertBalance.run(userId, 0);
    });
    
    transaction();
    
    console.log(`✓ Created user: ${userId} (${name})`);
    
    return getUser(userId);
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}

/**
 * Get user balance
 * @param {string} userId - User ID
 * @returns {number} - Balance in microAlgos
 */
function getBalance(userId) {
  try {
    const result = selectBalance.get(userId);
    
    if (!result) {
      // User has no balance entry, return 0
      return 0;
    }
    
    return result.balance;
  } catch (err) {
    console.error('Error getting balance:', err.message);
    throw new Error('Database error: Could not retrieve balance');
  }
}

/**
 * Credit amount to user balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit in microAlgos
 * @returns {number} - New balance
 */
function creditBalance(userId, amount) {
  try {
    if (amount < 0) {
      throw new Error('Credit amount must be positive');
    }
    
    // Ensure user exists
    const user = getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Add to balance
    upsertBalance.run(userId, amount);
    
    const newBalance = getBalance(userId);
    console.log(`✓ Credited ${amount} to ${userId}, new balance: ${newBalance}`);
    
    return newBalance;
  } catch (err) {
    console.error('Error crediting balance:', err.message);
    throw err;
  }
}

/**
 * Debit amount from user balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to debit in microAlgos
 * @returns {number} - New balance
 */
function debitBalance(userId, amount) {
  try {
    if (amount < 0) {
      throw new Error('Debit amount must be positive');
    }
    
    const currentBalance = getBalance(userId);
    
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    const newBalance = currentBalance - amount;
    updateBalance.run(newBalance, userId);
    
    console.log(`✓ Debited ${amount} from ${userId}, new balance: ${newBalance}`);
    
    return newBalance;
  } catch (err) {
    console.error('Error debiting balance:', err.message);
    throw err;
  }
}

/**
 * Get all users
 * @returns {Array} - Array of user objects
 */
function getAllUsers() {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    return users;
  } catch (err) {
    console.error('Error getting all users:', err.message);
    throw new Error('Database error: Could not retrieve users');
  }
}

/**
 * Get user balance details (including updated_at)
 * @param {string} userId - User ID
 * @returns {object|null} - Balance object or null
 */
function getBalanceDetails(userId) {
  try {
    const result = selectBalance.get(userId);
    return result || null;
  } catch (err) {
    console.error('Error getting balance details:', err.message);
    throw new Error('Database error: Could not retrieve balance details');
  }
}

// ============================================================================
// Transaction Functions
// ============================================================================

/**
 * Record a transaction
 * @param {string} userId - User ID
 * @param {string} type - Transaction type (deposit, withdrawal, etc.)
 * @param {number} amount - Amount in microAlgos
 * @param {string} txid - Blockchain transaction ID (optional)
 * @param {string} status - Transaction status (optional, default: 'pending')
 * @returns {number} - Transaction ID
 */
function recordTransaction(userId, type, amount, txid = null, status = 'pending') {
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (userId, type, amount, txid, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, type, amount, txid, status);
    
    console.log(`✓ Recorded ${type} transaction for ${userId}: ${amount} microAlgos`);
    
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Error recording transaction:', err.message);
    throw new Error('Database error: Could not record transaction');
  }
}

/**
 * Get user transaction history
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of transactions to return (default: 50)
 * @returns {Array} - Array of transaction objects
 */
function getTransactionHistory(userId, limit = 50) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE userId = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    
    return stmt.all(userId, limit);
  } catch (err) {
    console.error('Error getting transaction history:', err.message);
    throw new Error('Database error: Could not retrieve transaction history');
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  db,
  getUser,
  createUser,
  getBalance,
  creditBalance,
  debitBalance,
  getAllUsers,
  getBalanceDetails,
  recordTransaction,
  getTransactionHistory,
};

