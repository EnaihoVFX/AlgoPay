# 🎨 StickerPay NFT Creation & Claiming Guide

Complete guide to creating claimable NFTs and claiming them via QR codes in StickerPay.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Creating NFTs](#creating-nfts)
4. [Claiming NFTs](#claiming-nfts)
5. [API Reference](#api-reference)
6. [Command Line Tool](#command-line-tool)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## 🌟 Overview

StickerPay now includes a complete NFT creation and claiming system built on Algorand blockchain. Users can:

- **Create NFTs** through the web interface with custom metadata
- **Generate QR codes** for sharing NFTs
- **Claim NFTs** by scanning QR codes
- **Track NFT ownership** on-chain

All NFTs are created as Algorand Standard Assets (ASAs) on TestNet.

---

## 🔄 How It Works

### NFT Creation Flow

```
1. User fills out NFT creation form
   ↓
2. Frontend sends data to backend API
   ↓
3. Backend creates ASA on Algorand blockchain
   ↓
4. Unique claim code is generated
   ↓
5. NFT info + claim code stored in database
   ↓
6. QR code generated with claim URL
   ↓
7. User downloads/shares QR code
```

### NFT Claiming Flow

```
1. User scans QR code
   ↓
2. Scanner detects NFT claim code
   ↓
3. Backend fetches NFT info
   ↓
4. User confirms claim
   ↓
5. NFT transferred on-chain to user's wallet
   ↓
6. Database updated with claim status
   ↓
7. User owns the NFT!
```

---

## 🎨 Creating NFTs

### Via Web Interface

1. **Navigate to NFT Creation**
   - Open StickerPay app: `http://localhost:5173`
   - Click the "NFT" button on the home screen
   - Or visit directly: `http://localhost:5173/create-nft`

2. **Fill Out the Form**
   ```
   NFT Name *        : Cool Digital Art #1
   Unit Name         : COOL (optional, max 8 chars)
   Description       : A unique piece of digital art
   Image URL         : https://... or ipfs://...
   ```

3. **Create NFT**
   - Click "Create NFT" button
   - Wait for blockchain confirmation (~4 seconds)
   - NFT is created and QR code is generated!

4. **Share Your NFT**
   - Download QR code as PNG
   - Share the claim code
   - View on Algorand Explorer

### Important Notes

- **Name**: Max 32 characters, appears on blockchain
- **Unit Name**: Max 8 characters, like a ticker symbol (e.g., "COOL")
- **Image URL**: Must be publicly accessible (IPFS recommended for permanence)
- **TestNet**: All NFTs are created on Algorand TestNet

---

## 🎫 Claiming NFTs

### Via QR Code Scanning

1. **Open Scanner**
   - Navigate to home screen
   - Click "Scan" button
   - Or visit: `http://localhost:5173/pay`

2. **Scan NFT QR Code**
   - Point camera at QR code
   - App automatically detects NFT claim code
   - NFT information displayed

3. **Claim NFT**
   - Review NFT details
   - Click "Confirm Payment" (actually claims NFT)
   - Wait for blockchain confirmation
   - NFT is now yours!

### Via Claim Code (Manual)

You can also claim via the API directly:

```bash
curl -X POST http://localhost:3000/api/nft/claim \
  -H "Content-Type: application/json" \
  -d '{
    "claimCode": "YOUR_CLAIM_CODE_HERE",
    "recipientAddress": "YOUR_ALGORAND_ADDRESS",
    "userId": "testuser1"
  }'
```

---

## 📡 API Reference

### Create NFT

**POST** `/api/nft/create`

Creates a new claimable NFT on Algorand.

**Request Body:**
```json
{
  "name": "My NFT",
  "unitName": "MYNFT",
  "description": "A cool NFT",
  "imageUrl": "https://example.com/image.png",
  "metadataUrl": "https://example.com/metadata.json",
  "creatorUserId": "testuser1"
}
```

**Response:**
```json
{
  "success": true,
  "assetId": 123456,
  "claimCode": "a1b2c3d4e5f6...",
  "txId": "TXID123...",
  "name": "My NFT",
  "unitName": "MYNFT",
  "explorerUrl": "https://testnet.algoexplorer.io/asset/123456",
  "claimUrl": "http://localhost:5173/pay?type=nft&claim=a1b2c3d4e5f6..."
}
```

---

### Get NFT by Claim Code

**GET** `/api/nft/claim/:claimCode`

Retrieves NFT information using claim code.

**Response:**
```json
{
  "assetId": 123456,
  "name": "My NFT",
  "unitName": "MYNFT",
  "description": "A cool NFT",
  "imageUrl": "https://example.com/image.png",
  "creator": "ALGO_ADDRESS...",
  "status": "unclaimed",
  "claimedBy": null,
  "claimedAt": null,
  "explorerUrl": "https://testnet.algoexplorer.io/asset/123456"
}
```

---

### Claim NFT

**POST** `/api/nft/claim`

Claims an NFT and transfers it to the recipient.

**Request Body:**
```json
{
  "claimCode": "a1b2c3d4e5f6...",
  "recipientAddress": "ALGO_ADDRESS...",
  "userId": "testuser1"
}
```

**Response:**
```json
{
  "success": true,
  "assetId": 123456,
  "name": "My NFT",
  "txId": "CLAIM_TXID...",
  "explorerUrl": "https://testnet.algoexplorer.io/tx/CLAIM_TXID..."
}
```

---

### Get User's Created NFTs

**GET** `/api/nft/created/:userId`

Lists all NFTs created by a user.

**Response:**
```json
{
  "userId": "testuser1",
  "count": 2,
  "nfts": [
    {
      "assetId": 123456,
      "name": "My NFT #1",
      "claimCode": "a1b2c3d4...",
      "status": "unclaimed",
      "createdAt": "2025-10-19T..."
    }
  ]
}
```

---

### Get User's Claimed NFTs

**GET** `/api/nft/claimed/:userId`

Lists all NFTs claimed by a user.

---

### Get All Unclaimed NFTs

**GET** `/api/nft/unclaimed`

Lists all NFTs that haven't been claimed yet.

---

## 🖥️ Command Line Tool

You can also mint NFTs using the command line script.

### Basic Usage

```bash
# Create a single NFT
node scripts/mintClaimableNFT.js \
  --name "AlgoPay Collectible #1" \
  --unit "ALGOPAY" \
  --description "Limited edition AlgoPay NFT" \
  --image "https://i.imgur.com/example.png"
```

### Batch Minting

Create a JSON file with multiple NFTs:

**nfts.json:**
```json
[
  {
    "name": "Summer Collection #1",
    "unitName": "SUMM1",
    "description": "First in summer series",
    "imageUrl": "https://..."
  },
  {
    "name": "Summer Collection #2",
    "unitName": "SUMM2",
    "description": "Second in summer series",
    "imageUrl": "https://..."
  }
]
```

Then mint them all:

```bash
node scripts/mintClaimableNFT.js --batch --file nfts.json
```

### Script Options

```
--name NAME            NFT name (required)
--unit UNIT            Unit name (default: "NFT")
--description DESC     NFT description
--image URL            Image URL (IPFS, HTTP, etc.)
--metadata URL         Metadata JSON URL
--total NUM            Total supply (default: 1 for NFT)
--decimals NUM         Decimals (default: 0 for NFT)
--batch --file PATH    Mint multiple NFTs from JSON file
--help, -h             Show help message
```

---

## 💡 Examples

### Example 1: Create a Simple NFT

**Web Interface:**
1. Go to `/create-nft`
2. Fill in:
   - Name: "My First NFT"
   - Description: "Created with StickerPay!"
3. Click Create NFT
4. Download QR code
5. Share with friends!

### Example 2: Create NFT with Custom Image

```bash
node scripts/mintClaimableNFT.js \
  --name "Crypto Punk Homage #42" \
  --unit "PUNK42" \
  --description "Tribute to the OG NFT collection" \
  --image "https://ipfs.io/ipfs/QmYourImageHash"
```

### Example 3: Event Ticket NFTs

Create tickets for an event:

**event-tickets.json:**
```json
[
  {
    "name": "AlgoCon 2025 - VIP Pass",
    "unitName": "ACVIP",
    "description": "All-access VIP ticket",
    "imageUrl": "https://event.com/vip-ticket.png"
  },
  {
    "name": "AlgoCon 2025 - General",
    "unitName": "ACGEN",
    "description": "General admission ticket",
    "imageUrl": "https://event.com/general-ticket.png"
  }
]
```

```bash
node scripts/mintClaimableNFT.js --batch --file event-tickets.json
```

### Example 4: Digital Art Drop

1. Create 100 unique NFTs (different images)
2. Generate QR codes for each
3. Print QR codes on physical cards
4. Hand out at event
5. People scan to claim their unique NFT!

---

## 🐛 Troubleshooting

### NFT Creation Issues

**Error: "POOLED_MNEMONIC not configured"**
- Solution: Add your mnemonic to `.env` file

**Error: "Insufficient balance"**
- Solution: Fund the pooled account with TestNet ALGO
- Get free ALGO: https://bank.testnet.algorand.network/

**Error: "Name too long"**
- Solution: NFT names max 32 characters, unit names max 8 characters

### NFT Claiming Issues

**Error: "Recipient must opt-in to the asset first"**
- Solution: User must opt-in to receive NFT
- This is automatic in the pooled wallet setup
- For real wallets, use: `POST /api/nft/optin`

**Error: "NFT already claimed"**
- Solution: This NFT was already claimed by someone else
- Each NFT can only be claimed once

**Error: "Invalid claim code"**
- Solution: Double-check the claim code or QR code
- Make sure it hasn't expired or been revoked

### Database Issues

**Error: "Table not found"**
- Solution: NFT tables should auto-create
- Manual fix: Check `backend/nftHelpers.js` initialization
- Tables: `nft_assets`, `nft_claims`

---

## 🎯 Best Practices

### For Creators

1. **Use IPFS for images** - Ensures permanence
2. **Test on TestNet first** - Avoid mistakes on MainNet
3. **Keep claim codes secure** - They're like passwords
4. **Track your NFTs** - Use the dashboard to see created/claimed status

### For Users

1. **Verify NFT details** - Check before claiming
2. **Save transaction IDs** - For proof of ownership
3. **Use the Explorer** - Verify on-chain data
4. **Don't share your wallet keys** - Keep them private

### For Developers

1. **Rate limiting** - Add delays between batch mints
2. **Error handling** - Blockchain ops can fail
3. **Opt-in management** - Handle ASA opt-ins properly
4. **Gas fees** - Ensure pooled wallet has sufficient ALGO

---

## 🔗 Useful Links

- **Algorand TestNet Explorer**: https://testnet.algoexplorer.io/
- **TestNet ALGO Faucet**: https://bank.testnet.algorand.network/
- **IPFS Upload**: https://nft.storage/ (free)
- **AlgoSDK Docs**: https://developer.algorand.org/docs/sdks/javascript/

---

## 📈 What's Next?

Future enhancements:

- [ ] Royalties support
- [ ] NFT collections/series
- [ ] Batch claim (multiple NFTs at once)
- [ ] NFT marketplace integration
- [ ] Metadata standards (ARC-3, ARC-69)
- [ ] Fractional NFT ownership
- [ ] NFT burning/destroying
- [ ] Transfer to other users

---

## 🆘 Support

Having issues? Here's how to get help:

1. Check this guide's troubleshooting section
2. Review the API documentation
3. Check backend logs: `node backend/index.js`
4. Verify on TestNet Explorer
5. Check database: `sqlite3 backend/data.sqlite`

---

**Built with ❤️ for Algorand**  
**October 2025**

