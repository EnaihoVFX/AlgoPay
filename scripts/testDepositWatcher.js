#!/usr/bin/env node
/**
 * Test the depositWatcher by running one iteration
 */

// Load environment variables from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { testRun } = require('../backend/depositWatcher');

async function test() {
  console.log('🧪 Testing depositWatcher...\n');
  
  try {
    const result = await testRun();
    
    console.log('📊 Test Results:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Processed: ${result.processedCount} deposit(s)`);
    console.log(`Timestamp: ${result.timestamp}`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    
    if (result.deposits && result.deposits.length > 0) {
      console.log('\n💰 Deposits Found:');
      result.deposits.forEach((deposit, idx) => {
        console.log(`\n  [${idx + 1}] Transaction ID: ${deposit.txid}`);
        console.log(`      User ID: ${deposit.userId}`);
        console.log(`      Amount: ${deposit.amount} microAlgos`);
        console.log(`      Sender: ${deposit.sender}`);
        console.log(`      Time: ${deposit.timestamp}`);
      });
    } else {
      console.log('\n📭 No new deposits found in recent transactions');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (result.success) {
      console.log('✅ depositWatcher is working correctly!');
      console.log('\n💡 Next steps:');
      console.log('   1. Fund the account at: https://bank.testnet.algorand.network/');
      console.log(`   2. Address: ${process.env.POOLED_ADDRESS}`);
      console.log('   3. Send a test transaction with note: DEPOSIT:testuser1');
      console.log('   4. Run: node backend/depositWatcher.js');
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

test();

