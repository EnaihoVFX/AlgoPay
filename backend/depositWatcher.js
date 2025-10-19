/**
 * depositWatcher.js
 * 
 * Monitors an Algorand TestNet account for incoming transactions and credits
 * a local SQLite database when deposits are detected.
 * 
 * SETUP:
 * 1. Ensure .env file contains:
 *    - INDEXER_URL (e.g., https://testnet-algorand.api.purestake.io/idx2)
 *    - INDEXER_TOKEN (your PureStake API key)
 *    - POOLED_ADDRESS (the Algorand address to monitor)
 * 
 * 2. Run: node backend/depositWatcher.js
 * 
 * The script will:
 * - Create/initialize SQLite database at backend/data.sqlite
 * - Poll the Algorand Indexer every 5 seconds for new transactions
 * - Process transactions with notes starting with "DEPOSIT:<userId>"
 * - Update user balances in the database
 * 
 * TESTING:
 * - Send a TestNet transaction to POOLED_ADDRESS
 * - Include note: "DEPOSIT:testuser1" (or any userId)
 * - Watch console for confirmation
 */

require('dotenv').config();
const algosdk = require('algosdk');
const Database = require('better-sqlite3');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const INDEXER_URL = process.env.INDEXER_URL;
const INDEXER_TOKEN = process.env.INDEXER_TOKEN;
const POOLED_ADDRESS = process.env.POOLED_ADDRESS;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const TX_LIMIT = 20; // Number of recent transactions to check

// ============================================================================
// Database Setup
// ============================================================================

const DB_PATH = path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
function initializeDatabase() {
  console.log('Initializing database...');
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT
    )
  `);
  
  // Deposits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS deposits (
      txid TEXT PRIMARY KEY,
      userId TEXT,
      amount INTEGER,
      sender TEXT,
      created_at TEXT
    )
  `);
  
  // Balances table
  db.exec(`
    CREATE TABLE IF NOT EXISTS balances (
      userId TEXT PRIMARY KEY,
      balance INTEGER DEFAULT 0
    )
  `);
  
  console.log('Database initialized at:', DB_PATH);
}

// ============================================================================
// Prepared Statements (initialized after DB setup)
// ============================================================================

let checkDepositExists;
let insertDeposit;
let upsertBalance;
let ensureUser;

function initializePreparedStatements() {
  checkDepositExists = db.prepare('SELECT txid FROM deposits WHERE txid = ?');
  insertDeposit = db.prepare(`
    INSERT INTO deposits (txid, userId, amount, sender, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  upsertBalance = db.prepare(`
    INSERT INTO balances (userId, balance)
    VALUES (?, ?)
    ON CONFLICT(userId) DO UPDATE SET balance = balance + excluded.balance
  `);
  ensureUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name)
    VALUES (?, ?)
  `);
}

// ============================================================================
// Algorand Indexer Setup
// ============================================================================

function createIndexerClient() {
  if (!INDEXER_URL || !POOLED_ADDRESS) {
    throw new Error(
      'Missing required environment variables. Please ensure .env contains:\n' +
      '  - INDEXER_URL\n' +
      '  - POOLED_ADDRESS\n' +
      '  - INDEXER_TOKEN (can be empty for public APIs like AlgoNode)'
    );
  }
  
  // Parse the indexer URL to extract host and port
  const url = new URL(INDEXER_URL);
  const host = url.hostname;
  const port = url.port || (url.protocol === 'https:' ? 443 : 80);
  
  // Set up token - empty object for public APIs, or use X-API-Key header for PureStake
  const token = INDEXER_TOKEN ? { 'X-API-Key': INDEXER_TOKEN } : {};
  
  console.log(`Connecting to Algorand Indexer at ${host}:${port}`);
  
  return new algosdk.Indexer(token, url.protocol + '//' + url.host, url.port);
}

// ============================================================================
// Transaction Processing
// ============================================================================

/**
 * Decodes a base64 note from a transaction
 * @param {string} noteBase64 - Base64 encoded note
 * @returns {string|null} - Decoded note string or null
 */
function decodeNote(noteBase64) {
  try {
    if (!noteBase64) return null;
    const buffer = Buffer.from(noteBase64, 'base64');
    return buffer.toString('utf8');
  } catch (err) {
    console.error('Error decoding note:', err.message);
    return null;
  }
}

/**
 * Parses a deposit note to extract userId
 * @param {string} note - Decoded note string
 * @returns {string|null} - Extracted userId or null
 */
function parseDepositNote(note) {
  if (!note || !note.startsWith('DEPOSIT:')) {
    return null;
  }
  
  const userId = note.substring(8).trim(); // Remove "DEPOSIT:" prefix
  return userId || null;
}

/**
 * Processes a single deposit transaction
 * @param {object} tx - Transaction object from indexer
 * @returns {object|null} - Processed deposit info or null
 */
function processDeposit(tx) {
  try {
    const txid = tx.id;
    const paymentTx = tx['payment-transaction'];
    
    // Skip if not a payment transaction
    if (!paymentTx) {
      return null;
    }
    
    const receiver = paymentTx.receiver;
    const amount = paymentTx.amount;
    const sender = tx.sender;
    const note = decodeNote(tx.note);
    
    // Check if this transaction is to our pooled address
    if (receiver !== POOLED_ADDRESS) {
      return null;
    }
    
    // Parse the note for deposit information
    const userId = parseDepositNote(note);
    if (!userId) {
      return null;
    }
    
    // Check if this deposit has already been processed (idempotency)
    const existing = checkDepositExists.get(txid);
    if (existing) {
      return null; // Already processed
    }
    
    // Get transaction timestamp
    const timestamp = tx['round-time'] 
      ? new Date(tx['round-time'] * 1000).toISOString()
      : new Date().toISOString();
    
    // Process the deposit in a transaction
    const processTransaction = db.transaction(() => {
      // Ensure user exists
      ensureUser.run(userId, userId);
      
      // Insert deposit record
      insertDeposit.run(txid, userId, amount, sender, timestamp);
      
      // Update user balance
      upsertBalance.run(userId, amount);
    });
    
    processTransaction();
    
    console.log(`✓ Processed deposit txid ${txid} for user ${userId} amount ${amount} microAlgos`);
    
    return {
      txid,
      userId,
      amount,
      sender,
      timestamp
    };
  } catch (err) {
    console.error('Error processing deposit:', err.message);
    return null;
  }
}

// ============================================================================
// Main Polling Logic
// ============================================================================

/**
 * Fetches and processes recent transactions
 * @param {object} indexer - Algorand indexer client
 * @returns {Promise<Array>} - Array of processed deposits
 */
async function checkForDeposits(indexer) {
  try {
    // Fetch recent transactions to the pooled address
    const response = await indexer
      .lookupAccountTransactions(POOLED_ADDRESS)
      .limit(TX_LIMIT)
      .do();
    
    const transactions = response.transactions || [];
    const processedDeposits = [];
    
    // Process each transaction
    for (const tx of transactions) {
      const deposit = processDeposit(tx);
      if (deposit) {
        processedDeposits.push(deposit);
      }
    }
    
    return processedDeposits;
  } catch (err) {
    console.error('Error checking for deposits:', err.message);
    return [];
  }
}

/**
 * Main polling loop
 * @param {object} indexer - Algorand indexer client
 */
async function startPolling(indexer) {
  console.log(`\n🔍 Starting deposit watcher for address: ${POOLED_ADDRESS}`);
  console.log(`⏱️  Polling every ${POLL_INTERVAL_MS / 1000} seconds\n`);
  
  while (true) {
    await checkForDeposits(indexer);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ============================================================================
// Test Function (for acceptance testing)
// ============================================================================

/**
 * Runs one iteration of the deposit checker and returns results
 * @returns {Promise<object>} - Summary of processed transactions
 */
async function testRun() {
  try {
    // Ensure database is initialized
    if (!checkDepositExists) {
      initializeDatabase();
      initializePreparedStatements();
    }
    
    const indexer = createIndexerClient();
    const processedDeposits = await checkForDeposits(indexer);
    
    return {
      success: true,
      processedCount: processedDeposits.length,
      deposits: processedDeposits,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    // Initialize database
    initializeDatabase();
    
    // Initialize prepared statements
    initializePreparedStatements();
    
    // Create indexer client
    const indexer = createIndexerClient();
    
    // Test connection by trying to fetch account info (health check not reliable for all endpoints)
    console.log('Testing indexer connection...');
    try {
      await indexer.makeHealthCheck().do();
      console.log('✓ Indexer connection successful\n');
    } catch (healthErr) {
      // Health check might not work on all endpoints, try a simple query instead
      console.log('Health check not available, testing with account query...');
      try {
        await indexer.searchForTransactions().limit(1).do();
        console.log('✓ Indexer connection successful\n');
      } catch (queryErr) {
        console.log('⚠️  Warning: Could not verify indexer connection');
        console.log('   Continuing anyway (may work once account has transactions)\n');
      }
    }
    
    // Start polling
    await startPolling(indexer);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nPlease check:');
    console.error('  1. .env file exists with correct values');
    console.error('  2. INDEXER_URL and INDEXER_TOKEN are valid');
    console.error('  3. POOLED_ADDRESS is a valid Algorand address');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { testRun, checkForDeposits, processDeposit };

