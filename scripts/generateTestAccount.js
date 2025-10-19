#!/usr/bin/env node
/**
 * Generate a TestNet account for StickerPay
 * 
 * Usage: node scripts/generateTestAccount.js
 */

const algosdk = require('../backend/node_modules/algosdk');

function generateAccount() {
  console.log('🔑 Generating new Algorand TestNet account...\n');
  
  const account = algosdk.generateAccount();
  const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
  
  console.log('✅ Account generated successfully!\n');
  console.log('📋 Account Details:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Address: ${account.addr}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Mnemonic (25 words):`);
  console.log(`${mnemonic}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('⚠️  IMPORTANT:');
  console.log('1. Save the mnemonic in a secure location');
  console.log('2. Fund this account with TestNet ALGO from:');
  console.log('   https://bank.testnet.algorand.network/');
  console.log('   https://testnet.algoexplorer.io/dispenser');
  console.log('3. Update your .env file with these values:\n');
  
  console.log('Add to .env:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`POOLED_ADDRESS="${account.addr}"`);
  console.log(`POOLED_MNEMONIC="${mnemonic}"`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  console.log('🎉 Ready to receive deposits!');
}

// Run if executed directly
if (require.main === module) {
  generateAccount();
}

module.exports = { generateAccount };

