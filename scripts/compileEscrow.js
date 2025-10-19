#!/usr/bin/env node
/**
 * Compile Escrow LogicSig
 * 
 * This script compiles the escrow.teal file with a specific listingID
 * and creates a LogicSig account.
 * 
 * Usage: node scripts/compileEscrow.js <listingID>
 * Example: node scripts/compileEscrow.js listing123
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
const ESCROW_TEAL_PATH = path.join(__dirname, '..', 'contracts', 'escrow.teal');

// ============================================================================
// Helper Functions
// ============================================================================

function getAlgodClient() {
  const token = ALGOD_TOKEN ? { 'X-API-Key': ALGOD_TOKEN } : {};
  return new algosdk.Algodv2(token, ALGOD_SERVER, '');
}

async function compileEscrowLogicSig(listingID) {
  console.log('🔨 Compiling Escrow LogicSig\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Validate input
    if (!listingID) {
      throw new Error('listingID is required');
    }
    
    console.log(`📋 Listing ID: ${listingID}\n`);
    
    // Read TEAL template
    console.log('1️⃣  Reading TEAL template...');
    if (!fs.existsSync(ESCROW_TEAL_PATH)) {
      throw new Error(`TEAL file not found at ${ESCROW_TEAL_PATH}`);
    }
    
    let tealSource = fs.readFileSync(ESCROW_TEAL_PATH, 'utf8');
    console.log('   ✓ Template loaded\n');
    
    // Replace template variable
    console.log('2️⃣  Replacing template variable...');
    tealSource = tealSource.replace(/TMPL_LISTING_ID/g, listingID);
    console.log(`   ✓ TMPL_LISTING_ID → ${listingID}\n`);
    
    // Connect to algod
    console.log('3️⃣  Connecting to Algorand node...');
    const algodClient = getAlgodClient();
    const nodeStatus = await algodClient.status().do();
    console.log(`   ✓ Connected (round: ${nodeStatus['last-round']})\n`);
    
    // Compile TEAL
    console.log('4️⃣  Compiling TEAL program...');
    const compileResponse = await algodClient.compile(tealSource).do();
    const compiledProgram = new Uint8Array(
      Buffer.from(compileResponse.result, 'base64')
    );
    console.log('   ✓ Compilation successful\n');
    
    // Create LogicSig
    console.log('5️⃣  Creating LogicSig account...');
    const lsig = new algosdk.LogicSigAccount(compiledProgram);
    const escrowAddress = lsig.address();
    console.log(`   ✓ LogicSig created\n`);
    
    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Escrow LogicSig Compiled Successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📍 Escrow Address: ${escrowAddress}`);
    console.log(`🔗 Explorer: https://testnet.algoexplorer.io/address/${escrowAddress}\n`);
    
    console.log('📋 Program Details:');
    console.log(`   Hash: ${compileResponse.hash}`);
    console.log(`   Size: ${compiledProgram.length} bytes\n`);
    
    console.log('⚠️  IMPORTANT - Fund the Escrow:');
    console.log(`   The escrow address must be funded before it can send transactions.`);
    console.log(`   Send ALGO to: ${escrowAddress}\n`);
    
    console.log('💾 Saving compiled program...');
    const outputPath = path.join(__dirname, '..', 'contracts', `escrow_${listingID}.tealc`);
    fs.writeFileSync(outputPath, Buffer.from(compiledProgram));
    console.log(`   ✓ Saved to: ${outputPath}\n`);
    
    console.log('📝 Next Steps:');
    console.log('   1. Fund the escrow address with ALGO');
    console.log('   2. Buyer sends payment to escrow');
    console.log('   3. Create atomic group with:');
    console.log('      - ApplicationCall with "finalize" + listingID');
    console.log('      - Payment from escrow to seller (signed with LogicSig)\n');
    
    return {
      listingID,
      escrowAddress,
      program: compiledProgram,
      lsig,
      hash: compileResponse.hash
    };
    
  } catch (err) {
    console.error('\n❌ Compilation Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

// ============================================================================
// Usage Example Function
// ============================================================================

function printUsageExample(listingID, escrowAddress) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📖 Usage Example - Create Atomic Transaction Group');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('```javascript');
  console.log('const algosdk = require("algosdk");');
  console.log('');
  console.log('// Load compiled program');
  console.log(`const program = fs.readFileSync("contracts/escrow_${listingID}.tealc");`);
  console.log('const lsig = new algosdk.LogicSigAccount(program);');
  console.log('');
  console.log('// Create ApplicationCall transaction');
  console.log('const appCallTxn = algosdk.makeApplicationNoOpTxnFromObject({');
  console.log('  from: adminAddress,');
  console.log('  appIndex: marketplaceAppId,');
  console.log('  appArgs: [');
  console.log('    new Uint8Array(Buffer.from("finalize")),');
  console.log(`    new Uint8Array(Buffer.from("${listingID}"))`);
  console.log('  ],');
  console.log('  suggestedParams: params');
  console.log('});');
  console.log('');
  console.log('// Create Payment transaction from escrow');
  console.log('const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({');
  console.log(`  from: "${escrowAddress}",`);
  console.log('  to: sellerAddress,');
  console.log('  amount: price,');
  console.log('  suggestedParams: params');
  console.log('});');
  console.log('');
  console.log('// Create atomic group');
  console.log('const txnGroup = algosdk.assignGroupID([appCallTxn, paymentTxn]);');
  console.log('');
  console.log('// Sign transactions');
  console.log('const signedAppCall = appCallTxn.signTxn(adminPrivateKey);');
  console.log('const signedPayment = algosdk.signLogicSigTransaction(paymentTxn, lsig);');
  console.log('');
  console.log('// Submit group');
  console.log('await algodClient.sendRawTransaction([');
  console.log('  signedAppCall,');
  console.log('  signedPayment.blob');
  console.log(']).do();');
  console.log('```\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/compileEscrow.js <listingID>');
    console.log('Example: node scripts/compileEscrow.js listing123');
    process.exit(1);
  }
  
  const listingID = args[0];
  const result = await compileEscrowLogicSig(listingID);
  printUsageExample(result.listingID, result.escrowAddress);
}

if (require.main === module) {
  main();
}

module.exports = { compileEscrowLogicSig };

