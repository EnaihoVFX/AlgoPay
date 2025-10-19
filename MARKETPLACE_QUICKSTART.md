# NFT Marketplace - Quick Start Guide

Get your NFT marketplace up and running in 5 minutes!

## Prerequisites

- Node.js installed
- Backend and Frontend dependencies installed
- Backend server configured with `.env` file (including `POOLED_MNEMONIC`)

## Step 1: Start the Backend

```bash
cd backend
node index.js
```

You should see:
```
═══════════════════════════════════════════════════════════════
🚀 AlgoPay API Server Started
═══════════════════════════════════════════════════════════════
📍 Server running at: http://localhost:3000
...
🛒 Marketplace:
   GET  http://localhost:3000/api/marketplace/nfts
```

## Step 2: Start the Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## Step 3: Add Sample NFTs (Optional)

Open a third terminal:

```bash
node scripts/populateMarketplace.js
```

This creates 6 sample NFTs with images. Wait ~15-20 seconds for all NFTs to be created.

## Step 4: Visit the Marketplace

Open your browser and go to:
```
http://localhost:5173/marketplace
```

You should see:
- A grid of NFT cards (if you ran the populate script)
- Beautiful glass-morphism design
- Clickable NFT cards

## Step 5: Claim an NFT

1. Click on any NFT card
2. You'll be taken to the NFT detail page
3. Click the blue "Claim NFT" button
4. Wait ~4-6 seconds for blockchain confirmation
5. See success message
6. Get redirected to your profile

## Troubleshooting

### "No NFTs Available"

**Solution**: Run the populate script:
```bash
node scripts/populateMarketplace.js
```

### "Failed to fetch marketplace NFTs"

**Solution**: Make sure the backend is running:
```bash
cd backend
node index.js
```

### "Backend server is not running!" (when running populate script)

**Solution**: Start the backend server first (see Step 1)

### Claim button doesn't work

**Solution**: 
- Check backend logs for errors
- Ensure your `.env` has valid `POOLED_MNEMONIC`
- Verify you're on Algorand testnet

## What to Test

1. **Browse**: Scroll through the marketplace grid
2. **View Details**: Click on different NFTs
3. **Claim**: Try claiming an NFT
4. **Check Profile**: Go to profile page to see your claimed NFTs
5. **Empty State**: After claiming all NFTs, see the empty state

## Quick Commands Reference

```bash
# Start backend
cd backend && node index.js

# Start frontend (new terminal)
cd frontend && npm run dev

# Add test NFTs (new terminal, from project root)
node scripts/populateMarketplace.js

# Access marketplace
open http://localhost:5173/marketplace
```

## File Locations

- **Marketplace Page**: `frontend/src/pages/MarketplacePage.jsx`
- **Asset Detail Page**: `frontend/src/pages/AssetDetailPage.jsx`
- **Backend Endpoint**: `backend/index.js` (line 786-813)
- **Populate Script**: `scripts/populateMarketplace.js`

## Default Test Data

The populate script creates 6 NFTs:
1. Algorand Astronaut #1 (ASTRO)
2. Crypto Punk Cat (CPCAT)
3. Digital Art Masterpiece (DART)
4. Blockchain Token (BTOKEN)
5. Futuristic City (FCITY)
6. Neon Warrior (NWAR)

Each has:
- Unique name and description
- Image from Unsplash
- Unique claim code
- Real Algorand asset ID

## API Endpoint

```bash
# Get all marketplace NFTs
curl http://localhost:3000/api/marketplace/nfts

# Response format
{
  "count": 6,
  "nfts": [
    {
      "assetId": 123456,
      "name": "Algorand Astronaut #1",
      "unitName": "ASTRO",
      "description": "...",
      "imageUrl": "https://...",
      "claimCode": "abc123...",
      "explorerUrl": "https://testnet.algoexplorer.io/asset/123456",
      "claimUrl": "/pay?type=nft&claim=abc123..."
    },
    ...
  ]
}
```

## Next Steps

After getting it working:

1. **Read the full documentation**: See `MARKETPLACE_README.md`
2. **Understand the implementation**: See `MARKETPLACE_SUMMARY.md`
3. **Create your own NFTs**: Visit `/create-nft` page
4. **Customize the UI**: Edit `MarketplacePage.jsx`
5. **Add more features**: See the roadmap in README files

## Demo Checklist

✅ Backend running on port 3000
✅ Frontend running on port 5173
✅ Sample NFTs created
✅ Marketplace displays NFTs
✅ Can view NFT details
✅ Can claim NFTs successfully
✅ NFTs appear in profile after claiming

## Support

If you run into issues:
1. Check the terminal logs (backend and frontend)
2. Look at browser console (F12)
3. Verify environment variables in `.env`
4. Make sure you're using testnet
5. Check that NFTs exist in database

---

**You're all set! Enjoy exploring the marketplace! 🎨🛒**

