#!/usr/bin/env node
/**
 * Setup Real Listing (No Mock Data)
 * 
 * This script:
 * 1. Compiles escrow for the listing
 * 2. Creates listing in database with real escrow address
 * 3. Credits user balance for testing
 * 4. Provides instructions for live transactions
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { compileEscrowLogicSig } = require('./compileEscrow');
const listingHelpers = require('../backend/listingHelpers');
const db = require('../backend/db');

async function setupListing(listingID, title, price) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           SETUP REAL LISTING (NO MOCK DATA)                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Compile escrow
    console.log(`1️⃣  Compiling escrow for ${listingID}...`);
    const escrowData = await compileEscrowLogicSig(listingID);
    console.log(`   Escrow Address: ${escrowData.escrowAddress}\n`);
    
    // Step 2: Create listing in database
    console.log(`2️⃣  Creating listing in database...`);
    
    if (!process.env.POOLED_ADDRESS) {
      throw new Error('POOLED_ADDRESS not set in .env');
    }
    
    const listing = listingHelpers.createListing({
      id: listingID,
      title: title,
      description: 'Quality product available via StickerPay blockchain payments.',
      price: price,
      sellerAddress: process.env.POOLED_ADDRESS,
      escrowAddress: escrowData.escrowAddress,
      image: `https://via.placeholder.com/400x300?text=${encodeURIComponent(title)}`,
      rules: 'All sales final. Ships in 3-5 business days.',
      deadline: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    });
    console.log(`   ✓ Listing created in database\n`);
    
    // Step 3: Setup testuser1 with balance
    console.log(`3️⃣  Setting up testuser1 with balance...`);
    try {
      const user = db.getUser('testuser1');
      if (!user) {
        db.createUser('testuser1', 'Test User One');
      }
    } catch (err) {}
    
    const currentBalance = db.getBalance('testuser1');
    if (currentBalance < price) {
      db.creditBalance('testuser1', price * 2); // Credit 2x the price
      console.log(`   ✓ Credited testuser1 with ${price * 2} microAlgos\n`);
    } else {
      console.log(`   ✓ testuser1 already has sufficient balance\n`);
    }
    
    // Success!
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ SETUP COMPLETE                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📋 Listing Details:`);
    console.log(`   ID: ${listing.id}`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   Price: ${(listing.price / 1000000).toFixed(6)} ALGO`);
    console.log(`   Seller: ${listing.sellerAddress}`);
    console.log(`   Escrow: ${listing.escrowAddress}\n`);
    
    console.log(`🌐 Test URLs:`);
    console.log(`   Scanner: http://localhost:5173/scan?listing=${listingID}`);
    console.log(`   API: http://localhost:3000/api/listing/${listingID}\n`);
    
    console.log(`💰 User Balance:`);
    console.log(`   testuser1: ${db.getBalance('testuser1')} microAlgos\n`);
    
    console.log(`📝 Next Steps:`);
    console.log(`   1. Fund pooled account: https://bank.testnet.algorand.network/`);
    console.log(`      Address: ${process.env.POOLED_ADDRESS}`);
    console.log(`   2. Visit: http://localhost:5173/scan?listing=${listingID}`);
    console.log(`   3. Click "Pay Now"`);
    console.log(`   4. View transaction on TestNet!\n`);
    
    console.log(`🔍 Monitor Transactions:`);
    console.log(`   Account: https://testnet.algoexplorer.io/address/${process.env.POOLED_ADDRESS}`);
    console.log(`   Escrow: https://testnet.algoexplorer.io/address/${listing.escrowAddress}\n`);
    
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Run
const listingID = process.argv[2] || 'demo1';
const title = process.argv[3] || `Product ${listingID}`;
const price = parseInt(process.argv[4]) || 100000;

setupListing(listingID, title, price);

