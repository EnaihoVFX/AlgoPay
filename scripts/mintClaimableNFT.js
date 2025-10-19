#!/usr/bin/env node
/**
 * mintClaimableNFT.js
 * 
 * Create NFTs on Algorand blockchain that can be claimed via QR code
 * 
 * FEATURES:
 * - Mint NFTs (ASAs) with custom metadata
 * - Generate unique claim codes
 * - Store claim information in database
 * - Support for images, URLs, and metadata
 * 
 * USAGE:
 * node scripts/mintClaimableNFT.js --name "My NFT" --description "Cool NFT" --image "ipfs://..." --quantity 1
 * node scripts/mintClaimableNFT.js --batch --file nfts.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const algosdk = require('../backend/node_modules/algosdk');
const crypto = require('crypto');
const db = require('../backend/db');

// ============================================================================
// Configuration
// ============================================================================

const ALGOD_URL = process.env.ALGOD_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_TOKEN = process.env.ALGOD_TOKEN || '';
const POOLED_MNEMONIC = process.env.POOLED_MNEMONIC;

// ============================================================================
// Database Setup for NFT Claims
// ============================================================================

function initializeNFTTables() {
  console.log('Initializing NFT tables...');
  
  // NFT Assets table
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS nft_assets (
      assetId INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      unitName TEXT,
      description TEXT,
      imageUrl TEXT,
      metadataUrl TEXT,
      total INTEGER DEFAULT 1,
      decimals INTEGER DEFAULT 0,
      creator TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      claimable INTEGER DEFAULT 1,
      claimCode TEXT UNIQUE
    )
  `);
  
  // NFT Claims table  
  db.db.exec(`
    CREATE TABLE IF NOT EXISTS nft_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assetId INTEGER,
      claimCode TEXT NOT NULL,
      claimedBy TEXT,
      claimedAt TEXT,
      txid TEXT,
      status TEXT DEFAULT 'unclaimed',
      FOREIGN KEY (assetId) REFERENCES nft_assets(assetId)
    )
  `);
  
  console.log('✓ NFT tables ready');
}

initializeNFTTables();

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

function generateClaimCode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Mint a claimable NFT on Algorand
 */
async function mintClaimableNFT(options) {
  const {
    name,
    unitName = 'NFT',
    description = '',
    imageUrl = '',
    metadataUrl = '',
    total = 1,
    decimals = 0
  } = options;
  
  console.log('🎨 Minting Claimable NFT\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    // ========================================================================
    // Step 1: Get creator account
    // ========================================================================
    
    console.log('1️⃣  Loading creator account...');
    const creatorAccount = getPooledAccount();
    console.log(`   Creator: ${creatorAccount.addr}\n`);
    
    // ========================================================================
    // Step 2: Connect to Algorand
    // ========================================================================
    
    console.log('2️⃣  Connecting to Algorand...');
    const algodClient = getAlgodClient();
    const params = await algodClient.getTransactionParams().do();
    console.log(`   ✓ Connected to ${ALGOD_URL}\n`);
    
    // ========================================================================
    // Step 3: Generate claim code
    // ========================================================================
    
    console.log('3️⃣  Generating unique claim code...');
    const claimCode = generateClaimCode();
    console.log(`   Claim Code: ${claimCode}\n`);
    
    // ========================================================================
    // Step 4: Prepare NFT metadata
    // ========================================================================
    
    console.log('4️⃣  Preparing NFT metadata...');
    
    const metadata = {
      name,
      description,
      image: imageUrl,
      properties: {
        claimable: true,
        claimCode: claimCode
      }
    };
    
    // Note field with metadata (max 1KB)
    const note = new Uint8Array(
      Buffer.from(JSON.stringify(metadata).slice(0, 1000))
    );
    
    console.log(`   Name: ${name}`);
    console.log(`   Unit: ${unitName}`);
    console.log(`   Total: ${total}`);
    console.log(`   Image: ${imageUrl || 'None'}\n`);
    
    // ========================================================================
    // Step 5: Create NFT asset
    // ========================================================================
    
    console.log('5️⃣  Creating NFT on blockchain...');
    
    const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      from: creatorAccount.addr,
      total: total,
      decimals: decimals,
      defaultFrozen: false,
      manager: creatorAccount.addr,
      reserve: creatorAccount.addr,
      freeze: creatorAccount.addr,
      clawback: creatorAccount.addr,
      assetName: name,
      unitName: unitName,
      assetURL: metadataUrl || imageUrl,
      note: note,
      suggestedParams: params
    });
    
    console.log('   ✓ Transaction created\n');
    
    // ========================================================================
    // Step 6: Sign and send
    // ========================================================================
    
    console.log('6️⃣  Signing and sending to blockchain...');
    const signedTxn = assetCreateTxn.signTxn(creatorAccount.sk);
    const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
    console.log(`   Transaction ID: ${txId}\n`);
    
    // ========================================================================
    // Step 7: Wait for confirmation
    // ========================================================================
    
    console.log('7️⃣  Waiting for confirmation...');
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
    const assetId = confirmedTxn['asset-index'];
    console.log(`   ✓ Confirmed in round ${confirmedTxn['confirmed-round']}`);
    console.log(`   ✓ Asset ID: ${assetId}\n`);
    
    // ========================================================================
    // Step 8: Store in database
    // ========================================================================
    
    console.log('8️⃣  Storing NFT information in database...');
    
    const insertAsset = db.db.prepare(`
      INSERT INTO nft_assets (
        assetId, name, unitName, description, imageUrl, metadataUrl,
        total, decimals, creator, claimCode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertAsset.run(
      assetId,
      name,
      unitName,
      description,
      imageUrl,
      metadataUrl,
      total,
      decimals,
      creatorAccount.addr,
      claimCode
    );
    
    const insertClaim = db.db.prepare(`
      INSERT INTO nft_claims (assetId, claimCode, status)
      VALUES (?, ?, 'unclaimed')
    `);
    
    insertClaim.run(assetId, claimCode);
    
    console.log('   ✓ Saved to database\n');
    
    // ========================================================================
    // Success
    // ========================================================================
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║            ✅ CLAIMABLE NFT CREATED SUCCESSFULLY              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`🎫 NFT Details:`);
    console.log(`   Asset ID: ${assetId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Unit: ${unitName}`);
    console.log(`   Total Supply: ${total}`);
    console.log(`   Creator: ${creatorAccount.addr}\n`);
    
    console.log(`🔑 Claim Information:`);
    console.log(`   Claim Code: ${claimCode}`);
    console.log(`   Status: Unclaimed\n`);
    
    console.log(`📱 QR Code URL:`);
    const claimUrl = `http://localhost:5173/pay?type=nft&claim=${claimCode}`;
    console.log(`   ${claimUrl}\n`);
    
    console.log(`🔗 Explorer Links:`);
    console.log(`   Asset: https://testnet.algoexplorer.io/asset/${assetId}`);
    console.log(`   Transaction: https://testnet.algoexplorer.io/tx/${txId}\n`);
    
    console.log(`💡 Next Steps:`);
    console.log(`   1. Create QR code with claim URL: ${claimUrl}`);
    console.log(`   2. Share QR code with recipient`);
    console.log(`   3. Recipient scans QR code to claim NFT\n`);
    
    return {
      success: true,
      assetId,
      claimCode,
      txId,
      name,
      unitName,
      claimUrl,
      explorerUrl: `https://testnet.algoexplorer.io/asset/${assetId}`
    };
    
  } catch (err) {
    console.error('\n❌ Error minting NFT:', err.message);
    if (err.response) {
      console.error('Response:', JSON.stringify(err.response, null, 2));
    }
    throw err;
  }
}

/**
 * Mint multiple NFTs from a batch file
 */
async function mintBatchNFTs(filePath) {
  console.log('🎨 Batch Minting NFTs\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  try {
    const fs = require('fs');
    const nfts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`Found ${nfts.length} NFTs to mint\n`);
    
    const results = [];
    
    for (let i = 0; i < nfts.length; i++) {
      console.log(`\n[${i + 1}/${nfts.length}] Minting: ${nfts[i].name}\n`);
      
      const result = await mintClaimableNFT(nfts[i]);
      results.push(result);
      
      // Wait between mints to avoid rate limiting
      if (i < nfts.length - 1) {
        console.log('Waiting 3 seconds before next mint...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          ✅ BATCH MINTING COMPLETED SUCCESSFULLY              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total NFTs Minted: ${results.length}\n`);
    
    // Save results to file
    const outputPath = filePath.replace('.json', '_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${outputPath}\n`);
    
    return results;
    
  } catch (err) {
    console.error('\n❌ Error in batch minting:', err.message);
    throw err;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Algorand Claimable NFT Minting Tool              ║
╚═══════════════════════════════════════════════════════════════╝

Usage: node scripts/mintClaimableNFT.js [OPTIONS]

OPTIONS:
  --name NAME            NFT name (required)
  --unit UNIT            Unit name (default: "NFT")
  --description DESC     NFT description
  --image URL            Image URL (IPFS, HTTP, etc.)
  --metadata URL         Metadata JSON URL
  --total NUM            Total supply (default: 1 for NFT)
  --decimals NUM         Decimals (default: 0 for NFT)
  
  --batch --file PATH    Mint multiple NFTs from JSON file
  --help, -h             Show this help message

EXAMPLES:
  
  Single NFT:
    node scripts/mintClaimableNFT.js \\
      --name "AlgoPay Collectible #1" \\
      --unit "ALGOPAY" \\
      --description "Limited edition AlgoPay NFT" \\
      --image "https://i.imgur.com/example.png"
  
  Batch minting:
    node scripts/mintClaimableNFT.js --batch --file nfts.json
  
  Batch JSON format:
    [
      {
        "name": "NFT #1",
        "unitName": "NFT1",
        "description": "First NFT",
        "imageUrl": "https://..."
      },
      {
        "name": "NFT #2",
        "unitName": "NFT2",
        "description": "Second NFT",
        "imageUrl": "https://..."
      }
    ]

NOTES:
  - NFTs are created on Algorand TestNet
  - Each NFT gets a unique claim code
  - Claim codes are stored in the database
  - QR codes can be generated from claim URLs
  - NFTs must be claimed to be transferred to user
    `);
    process.exit(0);
  }
  
  try {
    // Check for batch mode
    if (args.includes('--batch')) {
      const fileIndex = args.indexOf('--file');
      if (fileIndex === -1 || !args[fileIndex + 1]) {
        console.error('❌ Error: --file PATH required for batch mode');
        process.exit(1);
      }
      
      const filePath = args[fileIndex + 1];
      await mintBatchNFTs(filePath);
      
    } else {
      // Parse single NFT arguments
      const options = {};
      
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        
        switch(key) {
          case 'name':
            options.name = value;
            break;
          case 'unit':
            options.unitName = value;
            break;
          case 'description':
            options.description = value;
            break;
          case 'image':
            options.imageUrl = value;
            break;
          case 'metadata':
            options.metadataUrl = value;
            break;
          case 'total':
            options.total = parseInt(value);
            break;
          case 'decimals':
            options.decimals = parseInt(value);
            break;
        }
      }
      
      if (!options.name) {
        console.error('❌ Error: --name required');
        console.log('Run with --help for usage information');
        process.exit(1);
      }
      
      await mintClaimableNFT(options);
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { mintClaimableNFT, mintBatchNFTs };

