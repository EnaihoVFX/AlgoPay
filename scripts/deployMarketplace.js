#!/usr/bin/env node
/**
 * Deploy Marketplace Smart Contract
 * 
 * This script compiles and deploys the PyTeal marketplace contract to Algorand TestNet
 * 
 * Prerequisites:
 * 1. Compile the PyTeal contract first:
 *    source venv/bin/activate
 *    python3 contracts/marketplace.py > contracts/marketplace_approval.teal
 *    python3 contracts/marketplace.py clear > contracts/marketplace_clear.teal
 * 
 * 2. Update .env with ALGOD_URL, ALGOD_TOKEN, and POOLED_MNEMONIC
 * 
 * Usage: node scripts/deployMarketplace.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const algosdk = require('../backend/node_modules/algosdk');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const ALGOD_SERVER = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const CREATOR_MNEMONIC = process.env.POOLED_MNEMONIC;

// Paths to compiled TEAL files
const APPROVAL_PROGRAM_PATH = path.join(__dirname, '..', 'contracts', 'marketplace_approval.teal');
const CLEAR_PROGRAM_PATH = path.join(__dirname, '..', 'contracts', 'marketplace_clear.teal');

// ============================================================================
// Helper Functions
// ============================================================================

function getAlgodClient() {
  const token = ALGOD_TOKEN ? { 'X-API-Key': ALGOD_TOKEN } : {};
  return new algosdk.Algodv2(token, ALGOD_SERVER, '');
}

async function compileProgram(client, programSource) {
  const encoder = new TextEncoder();
  const programBytes = encoder.encode(programSource);
  const compileResponse = await client.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, 'base64'));
}

async function waitForConfirmation(client, txId) {
  const response = await algosdk.waitForConfirmation(client, txId, 4);
  return response;
}

// ============================================================================
// Deployment Functions
// ============================================================================

async function deployMarketplaceContract() {
  console.log('🚀 Deploying Marketplace Smart Contract to Algorand TestNet\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Validate environment
    if (!CREATOR_MNEMONIC) {
      throw new Error('POOLED_MNEMONIC not found in .env file');
    }
    
    // Get creator account from mnemonic
    console.log('1️⃣  Loading creator account...');
    const creatorAccount = algosdk.mnemonicToSecretKey(CREATOR_MNEMONIC);
    console.log(`   Creator address: ${creatorAccount.addr}\n`);
    
    // Create algod client
    console.log('2️⃣  Connecting to Algorand node...');
    const algodClient = getAlgodClient();
    
    // Test connection
    const nodeStatus = await algodClient.status().do();
    console.log(`   Connected to network (round: ${nodeStatus['last-round']})\n`);
    
    // Check creator balance
    const accountInfo = await algodClient.accountInformation(creatorAccount.addr).do();
    console.log(`   Creator balance: ${accountInfo.amount / 1000000} ALGO\n`);
    
    if (accountInfo.amount < 100000) {
      throw new Error('Insufficient balance. Need at least 0.1 ALGO for deployment.');
    }
    
    // Read TEAL programs
    console.log('3️⃣  Reading compiled TEAL programs...');
    if (!fs.existsSync(APPROVAL_PROGRAM_PATH)) {
      throw new Error(`Approval program not found at ${APPROVAL_PROGRAM_PATH}\nRun: python3 contracts/marketplace.py > contracts/marketplace_approval.teal`);
    }
    if (!fs.existsSync(CLEAR_PROGRAM_PATH)) {
      throw new Error(`Clear program not found at ${CLEAR_PROGRAM_PATH}\nRun: python3 contracts/marketplace.py clear > contracts/marketplace_clear.teal`);
    }
    
    const approvalProgram = fs.readFileSync(APPROVAL_PROGRAM_PATH, 'utf8');
    const clearProgram = fs.readFileSync(CLEAR_PROGRAM_PATH, 'utf8');
    console.log('   ✓ Approval program loaded');
    console.log('   ✓ Clear state program loaded\n');
    
    // Compile programs
    console.log('4️⃣  Compiling programs...');
    const approvalProgramCompiled = await compileProgram(algodClient, approvalProgram);
    const clearProgramCompiled = await compileProgram(algodClient, clearProgram);
    console.log('   ✓ Programs compiled successfully\n');
    
    // Define state schemas
    const localInts = 5;
    const localBytes = 5;
    const globalInts = 10;
    const globalBytes = 10;
    
    console.log('5️⃣  Creating application transaction...');
    console.log(`   Global state: ${globalInts} ints, ${globalBytes} bytes`);
    console.log(`   Local state: ${localInts} ints, ${localBytes} bytes\n`);
    
    // Get suggested parameters
    const params = await algodClient.getTransactionParams().do();
    
    // Create application
    const txn = algosdk.makeApplicationCreateTxnFromObject({
      from: creatorAccount.addr,
      suggestedParams: params,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      approvalProgram: approvalProgramCompiled,
      clearProgram: clearProgramCompiled,
      numLocalInts: localInts,
      numLocalByteSlices: localBytes,
      numGlobalInts: globalInts,
      numGlobalByteSlices: globalBytes,
    });
    
    // Sign transaction
    console.log('6️⃣  Signing transaction...');
    const signedTxn = txn.signTxn(creatorAccount.sk);
    
    // Submit transaction
    console.log('7️⃣  Submitting transaction...');
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`   Transaction ID: ${txId}\n`);
    
    // Wait for confirmation
    console.log('8️⃣  Waiting for confirmation...');
    const confirmedTxn = await waitForConfirmation(algodClient, txId);
    
    // Get application ID
    const appId = confirmedTxn['application-index'];
    console.log(`   ✓ Confirmed in round ${confirmedTxn['confirmed-round']}\n`);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Marketplace Smart Contract Deployed Successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📝 Application ID: ${appId}`);
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/application/${appId}`);
    console.log(`👤 Admin Address: ${creatorAccount.addr}\n`);
    
    console.log('📋 Contract Methods:');
    console.log('   • create - Create a new listing');
    console.log('   • lock - Lock payment for a listing');
    console.log('   • finalize - Finalize a listing (admin only)');
    console.log('   • refund - Refund after deadline\n');
    
    console.log('💾 Save this Application ID to your .env file:');
    console.log(`   MARKETPLACE_APP_ID=${appId}\n`);
    
    return {
      appId,
      txId,
      adminAddress: creatorAccount.addr,
    };
    
  } catch (err) {
    console.error('\n❌ Deployment Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

if (require.main === module) {
  deployMarketplaceContract();
}

module.exports = { deployMarketplaceContract };

