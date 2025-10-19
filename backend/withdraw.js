/**
 * withdraw.js
 * 
 * Handles user withdrawals from StickerPay to external Algorand addresses
 * 
 * PROCESS:
 * 1. Verify user has sufficient available balance
 * 2. Deduct amount from database balance
 * 3. Build on-chain transaction from POOLED_ADDRESS to user's address
 * 4. Sign with pooled account
 * 5. Broadcast to network
 * 6. Return transaction ID
 * 
 * PRODUCTION CONSIDERATIONS:
 * - KYC/AML verification required before withdrawal
 * - Withdrawal limits (daily/weekly)
 * - Cooling-off period (24-48 hours)
 * - Two-factor authentication
 * - Email/SMS confirmation
 * - Anti-fraud detection
 * - Withdrawal fees
 * - Batch processing for efficiency
 * 
 * USAGE:
 * const { processWithdrawal } = require('./withdraw');
 * 
 * const result = await processWithdrawal({
 *   userId: 'user123',
 *   toAddress: 'ALGORAND_ADDRESS',
 *   amount: 100000  // microAlgos
 * });
 */

require('dotenv').config();
const algosdk = require('algosdk');
const db = require('./db');
const receiptHelpers = require('./receiptHelpers');

// ============================================================================
// Configuration
// ============================================================================

const ALGOD_URL = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const POOLED_MNEMONIC = process.env.POOLED_MNEMONIC;
const POOLED_ADDRESS = process.env.POOLED_ADDRESS;

// Withdrawal configuration
const MIN_WITHDRAWAL = 10000; // 0.01 ALGO minimum
const MAX_WITHDRAWAL = 1000000000; // 1000 ALGO maximum per transaction

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

async function waitForConfirmation(algodClient, txId, timeout = 4) {
  const response = await algosdk.waitForConfirmation(algodClient, txId, timeout);
  return response;
}

// ============================================================================
// Main Withdrawal Function
// ============================================================================

/**
 * Process user withdrawal
 * 
 * @param {object} params - Withdrawal parameters
 * @param {string} params.userId - User ID
 * @param {string} params.toAddress - Destination Algorand address
 * @param {number} params.amount - Amount in microAlgos
 * @returns {Promise<object>} - Result with txid or error
 */
async function processWithdrawal({ userId, toAddress, amount }) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    PROCESS WITHDRAWAL                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Withdrawal Details:`);
  console.log(`   User ID: ${userId}`);
  console.log(`   To Address: ${toAddress}`);
  console.log(`   Amount: ${amount} microAlgos (${(amount / 1000000).toFixed(6)} ALGO)\n`);
  
  // PRODUCTION NOTE:
  console.log('⚠️  PRODUCTION REQUIREMENTS (Currently bypassed for demo):');
  console.log('   • KYC/AML verification');
  console.log('   • Withdrawal limits enforcement');
  console.log('   • Cooling-off period (24-48 hours)');
  console.log('   • Two-factor authentication');
  console.log('   • Email/SMS confirmation');
  console.log('   • Anti-fraud detection');
  console.log('   • Withdrawal queue processing\n');
  
  let balanceDeducted = false;
  let deductedAmount = amount;
  
  try {
    // ========================================================================
    // Step 1: Validate inputs
    // ========================================================================
    
    console.log('1️⃣  Validating inputs...');
    
    if (!userId || !toAddress || !amount) {
      throw new Error('Missing required parameters: userId, toAddress, amount');
    }
    
    if (!algosdk.isValidAddress(toAddress)) {
      throw new Error('Invalid destination address');
    }
    
    if (amount < MIN_WITHDRAWAL) {
      throw new Error(`Amount below minimum withdrawal (${MIN_WITHDRAWAL} microAlgos)`);
    }
    
    if (amount > MAX_WITHDRAWAL) {
      throw new Error(`Amount exceeds maximum withdrawal (${MAX_WITHDRAWAL} microAlgos)`);
    }
    
    console.log('   ✓ All inputs valid\n');
    
    // ========================================================================
    // Step 2: Check user exists and has balance
    // ========================================================================
    
    console.log('2️⃣  Checking user balance...');
    const user = db.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const currentBalance = db.getBalance(userId);
    console.log(`   Current balance: ${currentBalance} microAlgos`);
    
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient balance: have ${currentBalance} microAlgos, need ${amount} microAlgos`
      );
    }
    
    console.log('   ✓ Sufficient balance available\n');
    
    // ========================================================================
    // Step 3: Deduct from database balance
    // ========================================================================
    
    console.log('3️⃣  Deducting from balance...');
    db.debitBalance(userId, amount);
    balanceDeducted = true;
    
    const newBalance = db.getBalance(userId);
    console.log(`   ✓ Balance updated: ${currentBalance} → ${newBalance} microAlgos\n`);
    
    // Record withdrawal transaction as pending
    const txnId = db.recordTransaction(
      userId,
      'withdrawal',
      amount,
      null,
      'pending'
    );
    console.log(`   ✓ Withdrawal recorded (db txn: ${txnId})\n`);
    
    // ========================================================================
    // Step 4: Get pooled account
    // ========================================================================
    
    console.log('4️⃣  Loading pooled account...');
    const pooledAccount = getPooledAccount();
    const pooledAddressStr = algosdk.encodeAddress(pooledAccount.addr.publicKey);
    console.log(`   Pooled Address: ${pooledAddressStr}\n`);
    
    // ========================================================================
    // Step 5: Check pooled account balance
    // ========================================================================
    
    console.log('5️⃣  Checking pooled account balance...');
    const algodClient = getAlgodClient();
    
    try {
      const accountInfo = await algodClient.accountInformation(pooledAddressStr).do();
      const pooledBalance = accountInfo.amount;
      
      console.log(`   Pooled balance: ${pooledBalance} microAlgos`);
      
      // Need amount + fee (min 1000 microAlgos)
      const totalNeeded = amount + 1000;
      
      if (pooledBalance < totalNeeded) {
        throw new Error(
          `Insufficient pooled account balance. Have ${pooledBalance}, need ${totalNeeded} microAlgos`
        );
      }
      
      console.log('   ✓ Sufficient funds in pooled account\n');
    } catch (err) {
      if (err.status === 404) {
        throw new Error('Pooled account not found or not funded on blockchain');
      }
      throw err;
    }
    
    // ========================================================================
    // Step 6: Build withdrawal transaction
    // ========================================================================
    
    console.log('6️⃣  Building withdrawal transaction...');
    const params = await algodClient.getTransactionParams().do();
    
    console.log(`   Creating payment transaction...`);
    console.log(`   DEBUG: pooledAddressStr = "${pooledAddressStr}" (type: ${typeof pooledAddressStr})`);
    console.log(`   DEBUG: toAddress = "${toAddress}" (type: ${typeof toAddress})`);
    console.log(`   DEBUG: amount = ${amount} (type: ${typeof amount})`);
    console.log(`   DEBUG: params.genesisID = "${params.genesisID}"`);
    
    let withdrawalTxn;
    try {
      withdrawalTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: pooledAddressStr,
        receiver: toAddress,
        amount: amount,
        note: new Uint8Array(Buffer.from(`AlgoPay withdrawal for ${userId}`)),
        suggestedParams: params
      });
      console.log(`   ✓ Transaction created!`);
    } catch (txnError) {
      console.error(`   ❌ Transaction creation failed!`);
      console.error(`   Error:`, txnError);
      console.error(`   Stack:`, txnError.stack);
      throw txnError;
    }
    
    console.log(`      From: ${pooledAddressStr}`);
    console.log(`      To: ${toAddress}`);
    console.log(`      Amount: ${amount} microAlgos`);
    
    // ========================================================================
    // Step 7: Sign transaction
    // ========================================================================
    
    console.log('7️⃣  Signing transaction...');
    const signedTxn = withdrawalTxn.signTxn(pooledAccount.sk);
    console.log('   ✓ Transaction signed\n');
    
    // ========================================================================
    // Step 8: Broadcast transaction
    // ========================================================================
    
    console.log('8️⃣  Broadcasting to Algorand network...');
    const broadcastResponse = await algodClient.sendRawTransaction(signedTxn).do();
    console.log('   DEBUG: broadcastResponse =', broadcastResponse);
    const txId = broadcastResponse.txId || broadcastResponse.txid;
    console.log(`   Transaction ID: ${txId}\n`);
    
    // ========================================================================
    // Step 9: Wait for confirmation
    // ========================================================================
    
    console.log('9️⃣  Waiting for confirmation...');
    const confirmedTxn = await waitForConfirmation(algodClient, txId);
    console.log(`   ✓ Confirmed in round ${confirmedTxn['confirmed-round']}\n`);
    
    // ========================================================================
    // Step 10: Update database with txid
    // ========================================================================
    
    console.log('🔟 Updating database...');
    
    // Update transaction status
    db.db.prepare(
      'UPDATE transactions SET txid = ?, status = ? WHERE id = ?'
    ).run(txId, 'confirmed', txnId);
    
    // Create receipt for withdrawal
    console.log('🧾 Creating receipt...');
    const receipt = receiptHelpers.createIndividualReceipt({
      txid: txId,
      listingID: 'withdrawal',
      userId,
      amount
    });
    console.log(`   ✓ Receipt created: ${receipt.receiptId}\n`);
    
    // ========================================================================
    // Success!
    // ========================================================================
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ WITHDRAWAL SUCCESSFUL                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`🎉 Withdrawal completed successfully!`);
    console.log(`   Transaction ID: ${txId}`);
    console.log(`   Round: ${confirmedTxn['confirmed-round']}`);
    console.log(`   Amount: ${(amount / 1000000).toFixed(6)} ALGO`);
    console.log(`   To: ${toAddress}`);
    console.log(`   Receipt: ${receipt.receiptId}`);
    console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${txId}\n`);
    
    return {
      success: true,
      txid: txId,
      round: confirmedTxn['confirmed-round'],
      amount,
      toAddress,
      userId,
      receiptId: receipt.receiptId,
      newBalance: db.getBalance(userId)
    };
    
  } catch (err) {
    // ========================================================================
    // Error Handling & Rollback
    // ========================================================================
    
    console.error('\n❌ Withdrawal failed!');
    console.error(`   Error: ${err.message}\n`);
    
    // Rollback balance if it was deducted
    if (balanceDeducted) {
      console.log('🔄 Rolling back balance deduction...');
      try {
        db.creditBalance(userId, deductedAmount);
        
        // Update transaction status to failed
        db.db.prepare(
          "UPDATE transactions SET status = 'failed' WHERE userId = ? AND type = 'withdrawal' AND status = 'pending'"
        ).run(userId);
        
        console.log(`   ✓ Balance restored to ${db.getBalance(userId)} microAlgos\n`);
      } catch (rollbackErr) {
        console.error(`   ⚠️  Rollback error: ${rollbackErr.message}`);
        console.error('   Manual intervention may be required!');
      }
    }
    
    return {
      success: false,
      error: err.message,
      userId,
      toAddress,
      amount
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  processWithdrawal,
  MIN_WITHDRAWAL,
  MAX_WITHDRAWAL
};

