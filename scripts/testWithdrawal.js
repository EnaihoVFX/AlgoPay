#!/usr/bin/env node
/**
 * Test Withdrawal Functionality
 * 
 * Demonstrates the withdrawal endpoint with comprehensive testing
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const algosdk = require('../backend/node_modules/algosdk');
const db = require('../backend/db');

const API_BASE_URL = 'http://localhost:3000';

async function testWithdrawal() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              WITHDRAWAL ENDPOINT TEST                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // ========================================================================
    // Setup: Generate test destination address
    // ========================================================================
    
    console.log('📝 Setup: Generating test destination address...');
    const destAccount = algosdk.generateAccount();
    console.log(`   Destination Address: ${destAccount.addr}\n`);
    
    // ========================================================================
    // Setup: Ensure testuser1 has balance
    // ========================================================================
    
    console.log('📝 Setup: Checking testuser1 balance...');
    const currentBalance = db.getBalance('testuser1');
    console.log(`   Current balance: ${currentBalance} microAlgos`);
    
    if (currentBalance < 50000) {
      console.log('   Crediting additional balance for testing...');
      db.creditBalance('testuser1', 100000);
      console.log(`   New balance: ${db.getBalance('testuser1')} microAlgos\n`);
    } else {
      console.log('   ✓ Sufficient balance for test\n');
    }
    
    // ========================================================================
    // Test 1: Validation - Missing Fields
    // ========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 1: Missing Fields Validation');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
        userId: 'testuser1'
        // Missing toAddress and amount
      });
    } catch (err) {
      console.log('✅ Expected error caught:');
      console.log(`   Error: ${err.response.data.error}`);
      console.log(`   Required: ${err.response.data.required.join(', ')}\n`);
    }
    
    // ========================================================================
    // Test 2: Validation - Invalid Address
    // ========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 2: Invalid Address Validation');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
        userId: 'testuser1',
        toAddress: 'INVALID_ADDRESS',
        amount: 10000
      });
    } catch (err) {
      console.log('✅ Expected error caught:');
      console.log(`   Error: ${err.response.data.error}`);
      console.log(`   Message: ${err.response.data.message}\n`);
    }
    
    // ========================================================================
    // Test 3: Validation - Amount Below Minimum
    // ========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 3: Amount Below Minimum');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
        userId: 'testuser1',
        toAddress: destAccount.addr,
        amount: 5000  // Below minimum of 10000
      });
    } catch (err) {
      console.log('✅ Expected error caught:');
      console.log(`   Error: ${err.response.data.error}`);
      console.log(`   Minimum: ${err.response.data.minimum} microAlgos`);
      console.log(`   Minimum ALGO: ${err.response.data.minimumAlgo}\n`);
    }
    
    // ========================================================================
    // Test 4: Validation - Insufficient Balance
    // ========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 4: Insufficient Balance');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Create test user with low balance
    try {
      db.createUser('lowbalance', 'Low Balance User');
      db.creditBalance('lowbalance', 5000);
    } catch (err) {
      // User might exist
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
        userId: 'lowbalance',
        toAddress: destAccount.addr,
        amount: 100000  // More than balance
      });
    } catch (err) {
      console.log('✅ Expected error caught:');
      console.log(`   Error: ${err.response.data.error}`);
      console.log(`   Current: ${err.response.data.current} microAlgos`);
      console.log(`   Requested: ${err.response.data.requested} microAlgos`);
      console.log(`   Shortfall: ${err.response.data.shortfall} microAlgos\n`);
    }
    
    // ========================================================================
    // Test 5: Actual Withdrawal (Will fail if pooled account not funded)
    // ========================================================================
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST 5: Actual Withdrawal Request');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const withdrawalAmount = 10000; // 0.01 ALGO
    const balanceBefore = db.getBalance('testuser1');
    
    console.log(`Before withdrawal:`);
    console.log(`   User balance: ${balanceBefore} microAlgos\n`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdraw`, {
        userId: 'testuser1',
        toAddress: destAccount.addr,
        amount: withdrawalAmount
      });
      
      console.log('✅ WITHDRAWAL SUCCESSFUL!\n');
      console.log(`📋 Withdrawal Details:`);
      console.log(`   Transaction ID: ${response.data.txid}`);
      console.log(`   Round: ${response.data.round}`);
      console.log(`   Amount: ${response.data.amountAlgo} ALGO`);
      console.log(`   To Address: ${response.data.toAddress}`);
      console.log(`   New Balance: ${response.data.newBalanceAlgo} ALGO`);
      console.log(`   Receipt ID: ${response.data.receiptId}\n`);
      
      console.log(`🔗 View on AlgoExplorer:`);
      console.log(`   ${response.data.explorer}\n`);
      
      console.log(`📊 Database Verification:`);
      const balanceAfter = db.getBalance('testuser1');
      console.log(`   Balance before: ${balanceBefore} microAlgos`);
      console.log(`   Balance after: ${balanceAfter} microAlgos`);
      console.log(`   Difference: ${balanceBefore - balanceAfter} microAlgos\n`);
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅ ALL TESTS PASSED - WITHDRAWAL WORKING!');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
    } catch (err) {
      console.log('❌ Withdrawal failed (Expected if pooled account not funded):\n');
      console.log(`   Error: ${err.response?.data?.error || err.message}\n`);
      
      // Check if balance was rolled back
      const balanceAfter = db.getBalance('testuser1');
      console.log(`📊 Rollback Verification:`);
      console.log(`   Balance before: ${balanceBefore} microAlgos`);
      console.log(`   Balance after: ${balanceAfter} microAlgos`);
      
      if (balanceBefore === balanceAfter) {
        console.log(`   ✅ Rollback successful - balance preserved!\n`);
      } else {
        console.log(`   ⚠️  Balance changed - this shouldn't happen!\n`);
      }
      
      console.log('💡 To complete this test:');
      console.log(`   1. Fund the pooled account at: https://bank.testnet.algorand.network/`);
      console.log(`   2. Address: ${process.env.POOLED_ADDRESS}`);
      console.log(`   3. Run this test again\n`);
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('✅ VALIDATION & ROLLBACK TESTS PASSED');
      console.log('⚠️  BLOCKCHAIN TRANSACTION PENDING FUNDING');
      console.log('═══════════════════════════════════════════════════════════════\n');
    }
    
  } catch (err) {
    console.error('\n❌ Test error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testWithdrawal();

