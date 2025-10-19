#!/usr/bin/env node
/**
 * Test commitPayment function
 * 
 * Usage: node scripts/testCommitPayment.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { commitPayment } = require('../backend/commitPayment');
const db = require('../backend/db');

async function test() {
  console.log('🧪 Testing commitPayment Function\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // Setup test user with balance
    const userId = 'testuser1';
    const listingID = 'listing123';
    const amount = 100000; // 0.1 ALGO
    
    // Ensure user exists and has balance
    console.log('📝 Setting up test user...');
    try {
      const user = db.getUser(userId);
      if (!user) {
        db.createUser(userId, 'Test User One');
      }
    } catch (err) {
      // User might already exist
    }
    
    // Credit test balance if needed
    const currentBalance = db.getBalance(userId);
    if (currentBalance < amount) {
      const needed = amount - currentBalance;
      db.creditBalance(userId, needed);
      console.log(`   ✓ Credited ${needed} microAlgos to ${userId}`);
    }
    
    console.log(`   ✓ User balance: ${db.getBalance(userId)} microAlgos\n`);
    
    // Test parameters
    console.log('📋 Test Parameters:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Listing ID: ${listingID}`);
    console.log(`   Amount: ${amount} microAlgos`);
    console.log(`   Seller: <TEST_SELLER_ADDRESS>`);
    console.log(`   Escrow: <TEST_ESCROW_ADDRESS>\n`);
    
    // Note: You need to provide actual addresses
    console.log('⚠️  To run actual test, you need to:');
    console.log('   1. Set MARKETPLACE_APP_ID in .env');
    console.log('   2. Fund POOLED_ADDRESS with TestNet ALGO');
    console.log('   3. Compile escrow for the listing');
    console.log('   4. Provide real seller and escrow addresses\n');
    
    // Example call (commented out - requires real addresses)
    /*
    const result = await commitPayment({
      userId: userId,
      listingID: listingID,
      amount: amount,
      sellerAddress: 'SELLER_ADDRESS_HERE',
      escrowAddress: 'ESCROW_ADDRESS_HERE'
    });
    
    if (result.ok) {
      console.log('\n✅ Payment committed successfully!');
      console.log(`   Transaction ID: ${result.txid}`);
      console.log(`   Explorer: https://testnet.algoexplorer.io/tx/${result.txid}`);
    } else {
      console.log('\n❌ Payment failed:');
      console.log(`   Error: ${result.error}`);
    }
    */
    
    console.log('📖 Example usage with curl:');
    console.log('```bash');
    console.log('curl -X POST http://localhost:3000/api/pay \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{');
    console.log('    "userId": "testuser1",');
    console.log('    "listingID": "listing123",');
    console.log('    "amount": 100000,');
    console.log('    "sellerAddress": "SELLER_ALGO_ADDRESS",');
    console.log('    "escrowAddress": "ESCROW_ALGO_ADDRESS"');
    console.log('  }\'');
    console.log('```\n');
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Test setup complete!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (err) {
    console.error('\n❌ Test error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

test();

