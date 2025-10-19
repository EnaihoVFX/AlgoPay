# NFT Marketplace

A basic NFT marketplace built on Algorand where users can browse and claim NFTs.

## Features

- **Browse NFTs**: View all available NFTs in a beautiful grid layout
- **NFT Details**: Click on any NFT to see detailed information
- **Claim NFTs**: Claim NFTs directly to your connected wallet
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Marketplace updates automatically as NFTs are claimed

## Architecture

### Backend

#### Endpoints

- `GET /api/marketplace/nfts` - Get all available NFTs for the marketplace
- `GET /api/nft/unclaimed` - Get all unclaimed NFTs
- `POST /api/nft/create` - Create a new NFT
- `POST /api/nft/claim` - Claim an NFT

### Frontend

#### Pages

- **MarketplacePage** (`/marketplace`) - Main marketplace page displaying all NFTs
- **AssetDetailPage** (`/asset/:assetId`) - Detailed view of an NFT with claim functionality

## Usage

### 1. Start the Backend Server

```bash
cd backend
node index.js
```

### 2. Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

### 3. Populate the Marketplace (Optional)

To add sample NFTs for testing:

```bash
node scripts/populateMarketplace.js
```

This will create 6 sample NFTs on the Algorand testnet that will appear in the marketplace.

### 4. Access the Marketplace

Open your browser and navigate to:
- Marketplace: http://localhost:5173/marketplace

## How It Works

### Creating NFTs

NFTs are created on the Algorand blockchain using the ASA (Algorand Standard Asset) protocol. Each NFT:
- Has a unique Asset ID
- Contains metadata (name, description, image)
- Has a unique claim code for claiming
- Is stored in the database for tracking

### Claiming NFTs

When a user claims an NFT:
1. The frontend sends the claim code to the backend
2. The backend verifies the NFT is available
3. The NFT is transferred from the creator wallet to the user's wallet
4. The claim status is updated in the database
5. The user is redirected to their profile

### Database Schema

```sql
-- NFT Assets
CREATE TABLE nft_assets (
  assetId INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  unitName TEXT,
  description TEXT,
  imageUrl TEXT,
  metadataUrl TEXT,
  total INTEGER DEFAULT 1,
  decimals INTEGER DEFAULT 0,
  creator TEXT,
  creatorUserId TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  claimable INTEGER DEFAULT 1,
  claimCode TEXT UNIQUE
);

-- NFT Claims
CREATE TABLE nft_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assetId INTEGER,
  claimCode TEXT NOT NULL,
  claimedBy TEXT,
  claimedByUserId TEXT,
  claimedAt TEXT,
  txid TEXT,
  status TEXT DEFAULT 'unclaimed',
  FOREIGN KEY (assetId) REFERENCES nft_assets(assetId)
);
```

## API Examples

### Get Marketplace NFTs

```bash
curl http://localhost:3000/api/marketplace/nfts
```

Response:
```json
{
  "count": 6,
  "nfts": [
    {
      "assetId": 123456,
      "name": "Algorand Astronaut #1",
      "unitName": "ASTRO",
      "description": "First in the Algorand Astronaut collection.",
      "imageUrl": "https://...",
      "claimCode": "abc123...",
      "explorerUrl": "https://testnet.algoexplorer.io/asset/123456",
      "claimUrl": "/pay?type=nft&claim=abc123..."
    }
  ]
}
```

### Create an NFT

```bash
curl -X POST http://localhost:3000/api/nft/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My NFT",
    "unitName": "NFT",
    "description": "A unique digital asset",
    "imageUrl": "https://example.com/image.png",
    "creatorUserId": "user1"
  }'
```

### Claim an NFT

```bash
curl -X POST http://localhost:3000/api/nft/claim \
  -H "Content-Type: application/json" \
  -d '{
    "claimCode": "abc123...",
    "recipientAddress": "ALGORAND_ADDRESS_HERE",
    "userId": "user1"
  }'
```

## UI Components

### Marketplace Grid

The marketplace displays NFTs in a responsive grid:
- 1 column on mobile
- 2 columns on tablet
- 3 columns on desktop

Each NFT card shows:
- NFT image (or placeholder)
- Name and description
- Asset ID
- Availability status

### NFT Detail Page

When clicking on an NFT, users see:
- Full-size image
- Complete description
- Asset information
- Claim button
- Success/error messages

## Styling

The marketplace uses:
- Tailwind CSS for utility classes
- Custom glass-morphism effects
- Gradient backgrounds
- Hover animations
- Responsive design

## Future Enhancements

Potential improvements:
- [ ] Add filtering (by creator, date, etc.)
- [ ] Add search functionality
- [ ] Add sorting options (newest, popular, etc.)
- [ ] Add NFT categories/tags
- [ ] Add pricing for paid NFTs
- [ ] Add bidding/auction functionality
- [ ] Add NFT transfer between users
- [ ] Add creator profiles
- [ ] Add favorites/wishlists
- [ ] Add NFT preview before claiming

## Troubleshooting

### NFTs not appearing in marketplace

- Check that the backend server is running
- Verify NFTs exist in the database: Check `nft_assets` table
- Ensure NFTs have status 'unclaimed' in `nft_claims` table

### Claim failed

- Verify the user's wallet address is valid
- Check that the NFT hasn't already been claimed
- Ensure the backend has sufficient funds for transaction fees
- Check backend logs for detailed error messages

### Images not loading

- Verify image URLs are accessible
- Check browser console for CORS errors
- Ensure images are using HTTPS URLs

## Technical Details

### Blockchain

- Network: Algorand Testnet
- Asset Type: ASA (Algorand Standard Asset)
- Transaction confirmation: ~4 seconds
- Explorer: https://testnet.algoexplorer.io

### Environment Variables

Required in backend `.env`:
```
POOLED_MNEMONIC=your_25_word_mnemonic
ALGOD_URL=https://testnet-api.algonode.cloud
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Support

For issues or questions:
- Check the backend logs for detailed error messages
- Verify all dependencies are installed
- Ensure you're using the correct network (testnet)
- Check that wallet addresses are valid Algorand addresses

## License

MIT

