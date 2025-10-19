#!/usr/bin/env node
/**
 * mintReceiptNFT.js
 * 
 * Optional script to mint on-chain ASA receipt NFTs
 * 
 * This creates an Algorand Standard Asset (ASA) for each receipt,
 * representing proof of purchase on the blockchain.
 * 
 * FEATURES:
 * - Mints one NFT per receipt
 * - Sets metadata with transaction details
 * - Transfers to buyer's address
 * - Permanent on-chain record
 * 
 * USAGE:
 * node scripts/mintReceiptNFT.js <receiptId> <buyerAddress>
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const algosdk = require('../backend/node_modules/algosdk');
const receiptHelpers = require('../backend/receiptHelpers');

// ============================================================================
// Configuration
// ============================================================================

const ALGOD_URL = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const POOLED_MNEMONIC = process.env.POOLED_MNEMONIC;

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

/**
 * Create ASA for receipt NFT
 */
async function mintReceiptNFT(receiptId, buyerAddress) {
  console.log('🎨 Minting Receipt NFT\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // ========================================================================
    // Step 1: Get receipt data
    // ========================================================================
    
    console.log('1️⃣  Fetching receipt data...');
    const receipt = receiptHelpers.getReceiptById(receiptId);
    
    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }
    
    console.log(`   Receipt ID: ${receipt.receiptId}`);
    console.log(`   Transaction: ${receipt.txid}`);
    console.log(`   Listing: ${receipt.listingID}`);
    console.log(`   Amount: ${receipt.amount} microAlgos\n`);
    
    // ========================================================================
    // Step 2: Validate buyer address
    // ========================================================================
    
    console.log('2️⃣  Validating buyer address...');
    if (!algosdk.isValidAddress(buyerAddress)) {
      throw new Error('Invalid buyer address');
    }
    console.log(`   Buyer: ${buyerAddress}\n`);
    
    // ========================================================================
    // Step 3: Get pooled account
    // ========================================================================
    
    console.log('3️⃣  Loading pooled account (NFT creator)...');
    const pooledAccount = getPooledAccount();
    console.log(`   Creator: ${pooledAccount.addr}\n`);
    
    // ========================================================================
    // Step 4: Connect to Algorand
    // ========================================================================
    
    console.log('4️⃣  Connecting to Algorand...');
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    console.log(`   ✓ Connected\n`);
    
    // ========================================================================
    // Step 5: Create NFT metadata
    // ========================================================================
    
    console.log('5️⃣  Preparing NFT metadata...');
    
    const assetName = `StickerPay Receipt #${receiptId.slice(-8)}`;
    const unitName = 'RCPT';
    const assetURL = `https://stickerpay.app/receipts/${receiptId}`;
    
    // Create metadata JSON
    const metadata = {
      receiptId: receipt.receiptId,
      txid: receipt.txid,
      listingID: receipt.listingID,
      amount: receipt.amount,
      type: receipt.type,
      timestamp: receipt.created_at,
      participants: receipt.participants
    };
    
    // Note field with metadata (max 1KB)
    const note = new Uint8Array(
      Buffer.from(JSON.stringify(metadata).slice(0, 1000))
    );
    
    console.log(`   Asset Name: ${assetName}`);
    console.log(`   Unit Name: ${unitName}`);
    console.log(`   URL: ${assetURL}\n`);
    
    // ========================================================================
    // Step 6: Create NFT (ASA)
    // ========================================================================
    
    console.log('6️⃣  Creating NFT asset...');
    
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: pooledAccount.addr,
      total: 1, // NFT - only 1 unit
      decimals: 0, // NFT - no decimals
      defaultFrozen: false,
      manager: pooledAccount.addr,
      reserve: pooledAccount.addr,
      freeze: undefined,
      clawback: undefined,
      assetName: assetName,
      unitName: unitName,
      assetURL: assetURL,
      assetMetadataHash: undefined,
      note: note,
      suggestedParams: params
    });
    
    console.log('   ✓ NFT transaction created\n');
    
    // ========================================================================
    // Step 7: Sign and send asset creation
    // ========================================================================
    
    console.log('7️⃣  Signing and sending asset creation...');
    const signedAssetCreate = assetCreateTxn.signTxn(pooledAccount.sk);
    const { txId: assetCreateTxId } = await algodClient.sendRawTransaction(signedAssetCreate).do();
    console.log(`   Transaction ID: ${assetCreateTxId}\n`);
    
    // ========================================================================
    // Step 8: Wait for confirmation
    // ========================================================================
    
    console.log('8️⃣  Waiting for asset creation confirmation...');
    const confirmedAssetCreate = await algosdk.waitForConfirmation(algodClient, assetCreateTxId, 4);
    const assetId = confirmedAssetCreate['asset-index'];
    console.log(`   ✓ NFT created! Asset ID: ${assetId}\n`);
    
    // ========================================================================
    // Step 9: Transfer NFT to buyer
    // ========================================================================
    
    console.log('9️⃣  Transferring NFT to buyer...');
    
    // Buyer must opt-in first (in production, check if opted in)
    // For demo, we'll note this requirement
    console.log('   ⚠️  Buyer must opt-in to asset first\n');
    
    console.log('   Creating transfer transaction...');
    const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: pooledAccount.addr,
      to: buyerAddress,
      assetIndex: assetId,
      amount: 1,
      suggestedParams: params
    });
    
    console.log('   Signing and sending transfer...');
    const signedTransfer = assetTransferTxn.signTxn(pooledAccount.sk);
    
    try {
      const { txId: transferTxId } = await algodClient.sendRawTransaction(signedTransfer).do();
      console.log(`   Transfer TX: ${transferTxId}\n`);
      
      console.log('🔟 Waiting for transfer confirmation...');
      const confirmedTransfer = await algosdk.waitForConfirmation(algodClient, transferTxId, 4);
      console.log(`   ✓ Transfer confirmed in round ${confirmedTransfer['confirmed-round']}\n`);
      
    } catch (transferErr) {
      if (transferErr.message.includes('receiver error')) {
        console.log('   ⚠️  Buyer has not opted in to the asset yet\n');
        console.log('   The NFT has been created but not transferred.');
        console.log('   Buyer should opt-in using:');
        console.log(`   goal asset optin --assetid ${assetId} --account ${buyerAddress}\n`);
      } else {
        throw transferErr;
      }
    }
    
    // ========================================================================
    // Success
    // ========================================================================
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ RECEIPT NFT MINTED                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`🎫 Receipt NFT Details:`);
    console.log(`   Asset ID: ${assetId}`);
    console.log(`   Asset Name: ${assetName}`);
    console.log(`   Unit Name: ${unitName}`);
    console.log(`   Total Supply: 1 (NFT)`);
    console.log(`   Receipt ID: ${receiptId}`);
    console.log(`   Buyer: ${buyerAddress}\n`);
    
    console.log(`🔗 Explorer Links:`);
    console.log(`   Asset: https://testnet.algoexplorer.io/asset/${assetId}`);
    console.log(`   Creation TX: https://testnet.algoexplorer.io/tx/${assetCreateTxId}\n`);
    
    console.log(`💾 Add to .env or database:`);
    console.log(`   RECEIPT_${receiptId}_ASSET_ID=${assetId}\n`);
    
    return {
      assetId,
      receiptId,
      assetName,
      unitName,
      assetURL,
      buyerAddress,
      creationTxId: assetCreateTxId,
      metadata
    };
    
  } catch (err) {
    console.error('\n❌ Error minting receipt NFT:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
    process.exit(1);
  }
}

/**
 * Batch mint receipts for pool participants
 */
async function mintPoolReceiptNFTs(poolID) {
  console.log('🎨 Minting Receipt NFTs for Pool\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    const poolHelpers = require('../backend/poolHelpers');
    const poolData = poolHelpers.getPoolWithParticipants(poolID);
    
    if (!poolData) {
      throw new Error('Pool not found');
    }
    
    if (poolData.status !== 'finalized') {
      throw new Error('Pool must be finalized before minting receipts');
    }
    
    console.log(`Pool: ${poolID}`);
    console.log(`Participants: ${poolData.participants.length}`);
    console.log(`Transaction: ${poolData.txid}\n`);
    
    const results = [];
    
    // Get receipts for this pool
    const db = require('../backend/db');
    const receipts = db.db.prepare(
      'SELECT * FROM receipts WHERE poolID = ?'
    ).all(poolID);
    
    console.log(`Found ${receipts.length} receipts to mint NFTs for\n`);
    
    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      console.log(`Minting NFT ${i + 1}/${receipts.length} for ${receipt.userId}...`);
      
      // In production, get user's Algorand address from database
      // For demo, we'll use the pooled address
      const buyerAddr = process.env.POOLED_ADDRESS;
      
      const result = await mintReceiptNFT(receipt.receiptId, buyerAddr);
      results.push(result);
      
      // Wait a bit between mints to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n✅ Minted ${results.length} receipt NFTs for pool ${poolID}\n`);
    
    return results;
    
  } catch (err) {
    console.error('\n❌ Error minting pool receipt NFTs:', err.message);
    process.exit(1);
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  Mint single receipt NFT:');
    console.log('    node scripts/mintReceiptNFT.js <receiptId> <buyerAddress>');
    console.log('');
    console.log('  Mint all receipts for a pool:');
    console.log('    node scripts/mintReceiptNFT.js --pool <poolID>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/mintReceiptNFT.js receipt_123_abc BUYER_ALGO_ADDRESS');
    console.log('  node scripts/mintReceiptNFT.js --pool pool_1760799864100_8f0cd0bd');
    process.exit(1);
  }
  
  if (args[0] === '--pool') {
    // Batch mint for pool
    const poolID = args[1];
    if (!poolID) {
      console.error('Error: Pool ID required');
      process.exit(1);
    }
    await mintPoolReceiptNFTs(poolID);
  } else {
    // Single receipt mint
    const receiptId = args[0];
    const buyerAddress = args[1];
    
    if (!buyerAddress) {
      console.error('Error: Buyer address required');
      process.exit(1);
    }
    
    await mintReceiptNFT(receiptId, buyerAddress);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mintReceiptNFT, mintPoolReceiptNFTs };

