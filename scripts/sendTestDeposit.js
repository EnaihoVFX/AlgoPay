#!/usr/bin/env node
/**
 * Send a test deposit transaction to the pooled address
 * 
 * This script will:
 * 1. Use the testnet dispenser to fund a sender account
 * 2. Send a transaction to POOLED_ADDRESS with DEPOSIT:testuser1 note
 * 
 * Usage: node scripts/sendTestDeposit.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const algosdk = require('../backend/node_modules/algosdk');

const ALGOD_SERVER = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const POOLED_ADDRESS = process.env.POOLED_ADDRESS;

async function sendTestDeposit() {
  try {
    console.log('🚀 Sending test deposit transaction...\n');
    
    if (!POOLED_ADDRESS) {
      throw new Error('POOLED_ADDRESS not found in .env file');
    }
    
    // Create algod client
    const token = ALGOD_TOKEN ? { 'X-API-Key': ALGOD_TOKEN } : '';
    const algodClient = new algosdk.Algodv2(token, ALGOD_SERVER, '');
    
    // Generate a temporary sender account (in production, this would be the user's account)
    console.log('1️⃣  Generating temporary sender account...');
    const senderAccount = algosdk.generateAccount();
    console.log(`   Sender address: ${senderAccount.addr}\n`);
    
    // Fund the sender account from testnet dispenser
    console.log('2️⃣  Funding sender account from TestNet dispenser...');
    console.log(`   Please visit: https://bank.testnet.algorand.network/`);
    console.log(`   And fund address: ${senderAccount.addr}`);
    console.log(`   (Waiting 10 seconds for manual funding...)\n`);
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if sender has funds
    console.log('3️⃣  Checking sender account balance...');
    let accountInfo;
    try {
      accountInfo = await algodClient.accountInformation(senderAccount.addr).do();
      console.log(`   Balance: ${accountInfo.amount} microAlgos\n`);
      
      if (accountInfo.amount === 0) {
        console.log('❌ Account not funded. Please fund the sender address manually:\n');
        console.log(`   1. Visit: https://bank.testnet.algorand.network/`);
        console.log(`   2. Enter address: ${senderAccount.addr}`);
        console.log(`   3. Complete the CAPTCHA and dispense`);
        console.log(`   4. Run this script again\n`);
        process.exit(1);
      }
    } catch (err) {
      if (err.status === 404) {
        console.log('❌ Account not found (not funded yet)\n');
        console.log('   Please fund the sender address manually:\n');
        console.log(`   1. Visit: https://bank.testnet.algorand.network/`);
        console.log(`   2. Enter address: ${senderAccount.addr}`);
        console.log(`   3. Complete the CAPTCHA and dispense`);
        console.log(`   4. Run this script again\n`);
        console.log(`   Alternatively, save this mnemonic and fund it later:`);
        console.log(`   ${algosdk.secretKeyToMnemonic(senderAccount.sk)}\n`);
        process.exit(1);
      }
      throw err;
    }
    
    // Prepare transaction
    console.log('4️⃣  Preparing deposit transaction...');
    const params = await algodClient.getTransactionParams().do();
    
    const userId = 'testuser1';
    const amount = 100000; // 0.1 ALGO
    const note = new Uint8Array(Buffer.from(`DEPOSIT:${userId}`));
    
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: senderAccount.addr,
      to: POOLED_ADDRESS,
      amount: amount,
      note: note,
      suggestedParams: params,
    });
    
    console.log(`   From: ${senderAccount.addr}`);
    console.log(`   To: ${POOLED_ADDRESS}`);
    console.log(`   Amount: ${amount} microAlgos (0.1 ALGO)`);
    console.log(`   Note: DEPOSIT:${userId}\n`);
    
    // Sign transaction
    console.log('5️⃣  Signing transaction...');
    const signedTxn = txn.signTxn(senderAccount.sk);
    
    // Send transaction
    console.log('6️⃣  Sending transaction to network...');
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`   Transaction ID: ${txId}\n`);
    
    // Wait for confirmation
    console.log('7️⃣  Waiting for confirmation...');
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    console.log(`   ✅ Confirmed in round ${confirmedTxn['confirmed-round']}\n`);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Test deposit sent successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🔍 The depositWatcher should now detect this transaction.');
    console.log('   Run: node backend/depositWatcher.js');
    console.log('   Or check: node scripts/testDepositWatcher.js\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

sendTestDeposit();

