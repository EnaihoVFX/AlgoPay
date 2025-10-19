/**
 * commitPayment.js
 * 
 * Handles payment commitment for marketplace listings.
 * 
 * PROCESS:
 * 1. Reserve funds in database (available -> reserved)
 * 2. Build atomic transaction group:
 *    - Payment: POOLED_ADDRESS -> ESCROW_ADDRESS
 *    - ApplicationCall: "lock" listing on marketplace contract
 * 3. Sign and send transactions
 * 4. Wait for confirmation
 * 5. Update database (reserved -> spent) or rollback on failure
 * 
 * USAGE:
 * const { commitPayment } = require('./commitPayment');
 * 
 * const result = await commitPayment({
 *   userId: 'user123',
 *   listingID: 'listing001',
 *   amount: 100000,  // microAlgos
 *   sellerAddress: 'SELLER_ALGO_ADDRESS',
 *   escrowAddress: 'ESCROW_ALGO_ADDRESS'
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
const MARKETPLACE_APP_ID = parseInt(process.env.MARKETPLACE_APP_ID || '0');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Algod client
 */
function getAlgodClient() {
  const token = ALGOD_TOKEN ? { 'X-API-Key': ALGOD_TOKEN } : {};
  return new algosdk.Algodv2(token, ALGOD_URL, '');
}

/**
 * Get pooled account from mnemonic
 */
function getPooledAccount() {
  if (!POOLED_MNEMONIC) {
    throw new Error('POOLED_MNEMONIC not configured in .env');
  }
  return algosdk.mnemonicToSecretKey(POOLED_MNEMONIC);
}

/**
 * Wait for transaction confirmation
 */
async function waitForConfirmation(algodClient, txId, timeout = 4) {
  const response = await algosdk.waitForConfirmation(algodClient, txId, timeout);
  return response;
}

/**
 * Reserve funds in database (available -> reserved)
 */
function reserveFunds(userId, amount, listingID) {
  console.log(`💰 Reserving ${amount} microAlgos for user ${userId}...`);
  
  try {
    // Get current balance
    const currentBalance = db.getBalance(userId);
    
    if (currentBalance < amount) {
      throw new Error(
        `Insufficient funds: have ${currentBalance} microAlgos, need ${amount} microAlgos`
      );
    }
    
    // Debit from balance (represents reserved amount)
    db.debitBalance(userId, amount);
    
    // Record the reservation in transactions table
    const txnId = db.recordTransaction(
      userId,
      'reserve',
      amount,
      null,
      'pending'
    );
    
    console.log(`   ✓ Reserved ${amount} microAlgos (txn: ${txnId})`);
    
    return { success: true, txnId };
  } catch (err) {
    console.error(`   ✗ Reservation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Rollback reserved funds (reserved -> available)
 */
function rollbackReservation(userId, amount) {
  console.log(`🔄 Rolling back reservation for user ${userId}...`);
  
  try {
    // Credit back to balance
    db.creditBalance(userId, amount);
    
    console.log(`   ✓ Rollback complete`);
  } catch (err) {
    console.error(`   ✗ Rollback failed: ${err.message}`);
    // Log but don't throw - this is a cleanup operation
  }
}

/**
 * Mark payment as committed in database
 */
function commitToDatabase(userId, amount, txid, listingID) {
  console.log(`📝 Recording committed payment in database...`);
  
  try {
    // Record the committed payment
    const txnId = db.recordTransaction(
      userId,
      'payment_committed',
      amount,
      txid,
      'confirmed'
    );
    
    console.log(`   ✓ Payment recorded (db txn: ${txnId}, chain txid: ${txid})`);
    
    return { success: true, txnId };
  } catch (err) {
    console.error(`   ✗ Database commit failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// Main Payment Commitment Function
// ============================================================================

/**
 * Commit payment for a listing
 * 
 * @param {object} params - Payment parameters
 * @param {string} params.userId - User ID
 * @param {string} params.listingID - Listing ID
 * @param {number} params.amount - Amount in microAlgos
 * @param {string} params.sellerAddress - Seller's Algorand address
 * @param {string} params.escrowAddress - Escrow LogicSig address
 * @returns {Promise<object>} - Result with txid or error
 */
async function commitPayment({ userId, listingID, amount, sellerAddress, escrowAddress }) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              COMMIT PAYMENT TO MARKETPLACE                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Payment Details:`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Listing ID: ${listingID}`);
  console.log(`   Amount: ${amount} microAlgos (${(amount / 1000000).toFixed(6)} ALGO)`);
  console.log(`   Seller: ${sellerAddress}`);
  console.log(`   Escrow: ${escrowAddress}\n`);
  
  let reservationAmount = amount;
  let reservationMade = false;
  
  try {
    // ========================================================================
    // Step 1: Validate inputs
    // ========================================================================
    
    console.log('1️⃣  Validating inputs...');
    
    if (!userId || !listingID || !amount || !sellerAddress || !escrowAddress) {
      throw new Error('Missing required parameters');
    }
    
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    if (!algosdk.isValidAddress(sellerAddress)) {
      throw new Error('Invalid seller address');
    }
    
    if (!algosdk.isValidAddress(escrowAddress)) {
      throw new Error('Invalid escrow address');
    }
    
    if (MARKETPLACE_APP_ID === 0) {
      throw new Error('MARKETPLACE_APP_ID not configured in .env');
    }
    
    console.log('   ✓ All inputs valid\n');
    
    // ========================================================================
    // Step 2: Reserve funds in database
    // ========================================================================
    
    console.log('2️⃣  Reserving funds in database...');
    reserveFunds(userId, amount, listingID);
    reservationMade = true;
    console.log('');
    
    // ========================================================================
    // Step 3: Get pooled account
    // ========================================================================
    
    console.log('3️⃣  Loading pooled account...');
    const pooledAccount = getPooledAccount();
    console.log(`   ✓ Loaded account: ${pooledAccount.addr}\n`);
    
    // ========================================================================
    // Step 4: Connect to Algorand node
    // ========================================================================
    
    console.log('4️⃣  Connecting to Algorand node...');
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    console.log(`   ✓ Connected (round: ${params.firstRound})\n`);
    
    // ========================================================================
    // Step 5: Build transaction group
    // ========================================================================
    
    console.log('5️⃣  Building atomic transaction group...');
    
    // Transaction 1: Payment from pooled account to escrow
    console.log('   📤 Creating payment transaction...');
    const pooledAddrStr = algosdk.encodeAddress(pooledAccount.addr.publicKey);
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: pooledAddrStr,
      receiver: escrowAddress,
      amount: amount,
      note: new Uint8Array(Buffer.from(`Payment for listing ${listingID}`)),
      suggestedParams: params
    });
    console.log(`      From: ${pooledAddrStr}`);
    console.log(`      To: ${escrowAddress}`);
    console.log(`      Amount: ${amount} microAlgos`);
    
    // Transaction 2: ApplicationCall to lock the listing
    console.log('   📞 Creating application call transaction...');
    const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({
      sender: pooledAddrStr,
      appIndex: MARKETPLACE_APP_ID,
      appArgs: [
        new Uint8Array(Buffer.from('lock')),
        new Uint8Array(Buffer.from(listingID))
      ],
      accounts: [
        sellerAddress,
        escrowAddress
      ],
      suggestedParams: params
    });
    console.log(`      App ID: ${MARKETPLACE_APP_ID}`);
    console.log(`      Method: lock`);
    console.log(`      Listing: ${listingID}`);
    console.log(`      Accounts: [${sellerAddress.slice(0, 8)}..., ${escrowAddress.slice(0, 8)}...]`);
    
    // Group transactions
    console.log('   🔗 Grouping transactions...');
    const txnGroup = algosdk.assignGroupID([paymentTxn, appCallTxn]);
    console.log(`      Group ID: ${Buffer.from(txnGroup[0].group).toString('base64').slice(0, 16)}...`);
    console.log('   ✓ Transaction group created\n');
    
    // ========================================================================
    // Step 6: Sign transactions
    // ========================================================================
    
    console.log('6️⃣  Signing transactions...');
    const signedPayment = paymentTxn.signTxn(pooledAccount.sk);
    const signedAppCall = appCallTxn.signTxn(pooledAccount.sk);
    console.log('   ✓ Both transactions signed\n');
    
    // ========================================================================
    // Step 7: Send transaction group
    // ========================================================================
    
    console.log('7️⃣  Sending transaction group to network...');
    const { txId } = await algodClient.sendRawTransaction([
      signedPayment,
      signedAppCall
    ]).do();
    console.log(`   ✓ Submitted with txID: ${txId}\n`);
    
    // ========================================================================
    // Step 8: Wait for confirmation
    // ========================================================================
    
    console.log('8️⃣  Waiting for confirmation...');
    const confirmedTxn = await waitForConfirmation(algodClient, txId);
    console.log(`   ✓ Confirmed in round ${confirmedTxn['confirmed-round']}\n`);
    
    // ========================================================================
    // Step 9: Commit to database
    // ========================================================================
    
    console.log('9️⃣  Updating database...');
    commitToDatabase(userId, amount, txId, listingID);
    console.log('');
    
    // ========================================================================
    // Step 10: Create receipt
    // ========================================================================
    
    console.log('🧾 Creating receipt...');
    const receipt = receiptHelpers.createIndividualReceipt({
      txid: txId,
      listingID,
      userId,
      amount
    });
    console.log(`   ✓ Receipt created: ${receipt.receiptId}\n`);
    
    // ========================================================================
    // Success!
    // ========================================================================
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ PAYMENT COMMITTED                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`🎉 Payment successfully committed!`);
    console.log(`   Transaction ID: ${txId}`);
    console.log(`   Round: ${confirmedTxn['confirmed-round']}`);
    console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${txId}\n`);
    
    return {
      ok: true,
      txid: txId,
      round: confirmedTxn['confirmed-round'],
      amount,
      listingID,
      userId,
      receiptId: receipt.receiptId
    };
    
  } catch (err) {
    // ========================================================================
    // Error Handling & Rollback
    // ========================================================================
    
    console.error('\n❌ Payment commitment failed!');
    console.error(`   Error: ${err.message}\n`);
    
    // Rollback reservation if it was made
    if (reservationMade) {
      console.log('🔄 Rolling back database reservation...');
      try {
        rollbackReservation(userId, reservationAmount);
      } catch (rollbackErr) {
        console.error(`   ⚠️  Rollback error: ${rollbackErr.message}`);
        console.error('   Manual intervention may be required!');
      }
    }
    
    console.log('');
    
    return {
      ok: false,
      error: err.message,
      userId,
      listingID,
      amount
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  commitPayment,
  getAlgodClient,
  getPooledAccount
};

