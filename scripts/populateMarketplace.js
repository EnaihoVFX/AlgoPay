/**
 * populateMarketplace.js
 * 
 * Script to populate the marketplace with sample NFTs for testing
 * 
 * Usage:
 *   node scripts/populateMarketplace.js
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Sample NFT data
const sampleNFTs = [
  {
    name: 'Algorand Astronaut #1',
    unitName: 'ASTRO',
    description: 'First in the Algorand Astronaut collection. A brave explorer venturing into the blockchain universe.',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500',
    metadataUrl: '',
    creatorUserId: 'creator1'
  },
  {
    name: 'Crypto Punk Cat',
    unitName: 'CPCAT',
    description: 'A rare digital cat with attitude. One of the most sought-after collectibles in the metaverse.',
    imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500',
    metadataUrl: '',
    creatorUserId: 'creator2'
  },
  {
    name: 'Digital Art Masterpiece',
    unitName: 'DART',
    description: 'Abstract digital art representing the fusion of technology and creativity.',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500',
    metadataUrl: '',
    creatorUserId: 'creator3'
  },
  {
    name: 'Blockchain Token',
    unitName: 'BTOKEN',
    description: 'A symbolic representation of decentralized finance and blockchain technology.',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=500',
    metadataUrl: '',
    creatorUserId: 'creator1'
  },
  {
    name: 'Futuristic City',
    unitName: 'FCITY',
    description: 'A glimpse into the future - a smart city powered by blockchain technology.',
    imageUrl: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=500',
    metadataUrl: '',
    creatorUserId: 'creator2'
  },
  {
    name: 'Neon Warrior',
    unitName: 'NWAR',
    description: 'A cyberpunk warrior ready to defend the decentralized realm.',
    imageUrl: 'https://images.unsplash.com/photo-1593642532400-2682810df593?w=500',
    metadataUrl: '',
    creatorUserId: 'creator3'
  }
];

async function createNFT(nftData) {
  try {
    console.log(`\n🎨 Creating NFT: ${nftData.name}...`);
    
    const response = await fetch(`${BASE_URL}/api/nft/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nftData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`   ✅ Created successfully!`);
      console.log(`   Asset ID: ${data.assetId}`);
      console.log(`   Claim Code: ${data.claimCode}`);
      console.log(`   Explorer: ${data.explorerUrl}`);
      return data;
    } else {
      console.error(`   ❌ Failed to create: ${data.message || 'Unknown error'}`);
      return null;
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function populateMarketplace() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🛒 Populating Marketplace with Sample NFTs');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\nThis will create sample NFTs on the Algorand testnet.');
  console.log('Make sure the backend server is running!');
  console.log('\nStarting in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const results = [];
  
  for (const nft of sampleNFTs) {
    const result = await createNFT(nft);
    if (result) {
      results.push(result);
    }
    // Wait a bit between creations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`✅ Marketplace Population Complete!`);
  console.log(`   Created: ${results.length}/${sampleNFTs.length} NFTs`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (results.length > 0) {
    console.log('\n📋 Summary:');
    results.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.name}`);
      console.log(`   Asset ID: ${result.assetId}`);
      console.log(`   Claim Code: ${result.claimCode}`);
    });
    
    console.log('\n\n🎉 You can now visit the marketplace to see these NFTs!');
    console.log('   Open: http://localhost:5173/marketplace\n');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Backend server is not running!');
    console.error('   Please start the server first:');
    console.error('   cd backend && node index.js\n');
    process.exit(1);
  }
  
  await populateMarketplace();
})();

